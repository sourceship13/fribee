import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import DealSharingService from '../../services/deal-sharing.service';
import { useAuth } from './useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/api.service';

interface Contact {
  recordID: string;
  displayName: string;
  givenName: string | null;
  familyName: string;
  middleName: string;
  company: string | null;
  phoneNumbers: Array<{
    label: string;
    number: string;
  }>;
  emailAddresses: Array<{
    label: string;
    email: string;
  }>;
  [key: string]: any; // For additional properties from react-native-contacts
}

interface ShareProgress {
  currentShares: number;
  requiredShares: number;
  canRedeem: boolean;
  shareHistory: Array<{
    contactName: string;
    phoneNumber: string;
    sharedAt: string;
  }>;
}

export const useDealSharing = (dealId?: string, requiredShares: number = 3) => {
  const { user, heartDeal } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Array<{
    contactId: string;
    name: string;
    phoneNumber: string;
  }>>([]);
  const [shareProgress, setShareProgress] = useState<ShareProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasContactsPermission, setHasContactsPermission] = useState<'granted' | 'denied' | 'blocked' | 'unavailable' | null>(null);

  // Load share progress when dealId changes
  useEffect(() => {
    if (dealId && user?.id) {
      loadShareProgress();
    }
  }, [dealId, user?.id]);

  // Check permission status on hook initialization
  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const permissionStatus = await DealSharingService.checkContactsPermissionStatus();
      setHasContactsPermission(permissionStatus);
      if (permissionStatus === 'granted') {
        await loadContacts();
      }
    } catch (error) {
      console.error('❌ Error checking permission status:', error);
      setHasContactsPermission('denied');
    }
  };

  const requestContactsAccess = async () => {
    try {
      setLoading(true);
      const granted = await DealSharingService.requestContactsPermission();
      
      if (granted) {
        setHasContactsPermission('granted');
        await loadContacts();
        // Don't show alert here - will be handled by the button component
      } else {
        setHasContactsPermission('denied');
        Alert.alert(
          'Permission Denied',
          'We need access to your contacts to share deals with friends.'
        );
      }
    } catch (error) {
      console.error('❌ Error requesting contacts access:', error);
      Alert.alert('Error', 'Failed to access contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      const importedContacts = await DealSharingService.loadContacts();
      // Ensure contacts are sorted alphabetically (double-check)
      const sortedContacts = importedContacts.sort((a, b) => {
        const nameA = a.displayName.toLowerCase();
        const nameB = b.displayName.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setContacts(sortedContacts);
      // Send contacts to backend
      try {
        const contactsPayload = sortedContacts.map(c => ({
          contact_number: c.phoneNumbers?.[0]?.number || '',
          display_name: c.displayName || '',
        })).filter(c => c.contact_number && c.display_name);
        if (contactsPayload.length > 0 && user?.id) {
          const apiResult = await apiService.postContacts({ userId: user.id, contacts: contactsPayload });
        } else {
          throw new Error('Missing userId or contacts array');
        }
      } catch (apiError) {
        console.error('❌ Error sending contacts to backend:', apiError);
      }
    } catch (error) {
      console.error('❌ Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleContactSelection = (contact: Contact) => {
    const phoneNumber = contact.phoneNumbers[0]?.number;
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'This contact does not have a phone number.');
      return;
    }

    setSelectedContacts(prev => {
      const exists = prev.find(c => c.contactId === contact.recordID);
      if (exists) {
        return prev.filter(c => c.contactId !== contact.recordID);
      } else {
        return [...prev, {
          contactId: contact.recordID,
          name: contact.displayName,
          phoneNumber: phoneNumber.replace(/\D/g, '') // Remove non-digits
        }];
      }
    });
  };

  const shareDeal = async (deal: any) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to share deals.');
      return;
    }

    if (selectedContacts.length === 0) {
      Alert.alert('No Contacts Selected', 'Please select at least one contact to share with.');
      return;
    }

    try {
      setLoading(true);
      // Convert selected contacts to Contact format for the service
      const contactsToShare = selectedContacts.map(sc => {
        const originalContact = contacts.find(c => c.recordID === sc.contactId);
        return originalContact || {
          recordID: sc.contactId,
          displayName: sc.name,
          givenName: null,
          familyName: '',
          middleName: '',
          company: null,
          phoneNumbers: [{ label: 'mobile', number: sc.phoneNumber }],
          emailAddresses: []
        };
      });
      const success = await DealSharingService.shareWithContacts(dealId || '', contactsToShare, deal);
      if (success) {
        // Clear selection and reload progress
        setSelectedContacts([]);
        await loadShareProgress();
        // Heart the deal after first successful share
        if (dealId && user?.id) {
          // Check current share count
          const key = `shares_${dealId}`;
          const sharesString = await AsyncStorage.getItem(key);
          const currentShares = sharesString ? parseInt(sharesString, 10) : 0;
          if (currentShares >= 1) {
            // Heart the deal after first share
            if (typeof heartDeal === 'function') {
              await heartDeal(dealId, deal);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error sharing deal:', error);
      Alert.alert('Error', 'Failed to share deal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadShareProgress = async () =>
  {
    if (!dealId || !user?.id) return;

    try {
      const progress = await DealSharingService.getShareProgress(dealId, requiredShares);

      setShareProgress({
        currentShares: progress.currentShares,
        requiredShares: progress.requiredShares,
        canRedeem: progress.canRedeem,
        shareHistory: [] // TODO: Add share history tracking
      });
      
    } catch (error) {
      console.error('❌ Error loading share progress:', error);
    }
  };

  const searchContacts = useCallback((query: string) => {
    console.log('🔍 Searching contacts with query:', query);
    console.log('📋 Total contacts available:', contacts.length);
    
    if (!query.trim()) {
      console.log('✅ No query, returning all contacts');
      return contacts;
    }
    
    const searchTerm = query.toLowerCase().trim();
    const searchDigits = query.replace(/\D/g, ''); // Extract digits for phone number search
    
    const filtered = contacts.filter(contact => {
      // Search by name fields
      const matchesDisplayName = contact.displayName?.toLowerCase().includes(searchTerm);
      const matchesGivenName = contact.givenName?.toLowerCase().includes(searchTerm);
      const matchesFamilyName = contact.familyName?.toLowerCase().includes(searchTerm);
      
      // Search by phone number (only if there are digits in the query)
      const matchesPhone = searchDigits.length > 0 && contact.phoneNumbers?.some(phone => {
        const phoneDigits = phone.number?.replace(/\D/g, '') || '';
        return phoneDigits.includes(searchDigits);
      });
      
      const isMatch = matchesDisplayName || matchesGivenName || matchesFamilyName || matchesPhone;
      
      if (isMatch) {
        console.log('✅ Match found:', {
          name: contact.displayName,
          matchesDisplayName,
          matchesGivenName,
          matchesFamilyName,
          matchesPhone
        });
      }
      
      return isMatch;
    });
    
    console.log('✅ Filtered contacts:', filtered.length);
    return filtered;
  }, [contacts]);

  const clearSelection = () => {
    setSelectedContacts([]);
  };

  return {
    // State
    contacts,
    selectedContacts,
    shareProgress,
    loading,
    hasContactsPermission,
    
    // Actions  
    requestContactsAccess,
    loadContacts,
    toggleContactSelection,
    shareDeal,
    loadShareProgress,
    searchContacts,
    clearSelection,
    checkPermissionStatus,
    
    // Computed
    canShare: selectedContacts.length > 0,
    selectedCount: selectedContacts.length,
    isContactSelected: (contactId: string) => 
      selectedContacts.some(c => c.contactId === contactId),
    
    // Progress info
    sharingComplete: shareProgress?.canRedeem || false,
    remainingShares: shareProgress ? 
      Math.max(0, shareProgress.requiredShares - shareProgress.currentShares) : requiredShares,
    progressPercentage: shareProgress ? 
      Math.min(100, (shareProgress.currentShares / shareProgress.requiredShares) * 100) : 0
  };
};