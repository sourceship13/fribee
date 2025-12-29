import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getColors } from '../../libs/hooks/useAuth';
import { iOSUIKit } from 'react-native-typography';
import { TextInput } from 'react-native-gesture-handler';

interface ContactSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  deal: any;
  colors: ReturnType<typeof getColors>;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  filteredContacts: any[];
  selectedContacts: any[];
  selectedCount: number;
  toggleContactSelection: (contact: any) => void;
  clearSelection: () => void;
  onShare: () => void;
  canShare: boolean;
  sharingLoading: boolean;
  requestContactsAccess: () => void;
}

const ContactSelectionModal: React.FC<ContactSelectionModalProps> = ({
  visible,
  onClose,
  deal,
  colors,
  searchQuery,
  onSearchChange,
  filteredContacts,
  selectedContacts,
  selectedCount,
  toggleContactSelection,
  clearSelection,
  onShare,
  canShare,
  sharingLoading,
  requestContactsAccess,
}) => {
  const renderContactItem = ({ item }: { item: any }) => {
    const isSelected = selectedContacts.some(
      contact => contact.contactId === item.recordID,
    );

    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
          isSelected && {
            backgroundColor: colors.primary + '20',
            borderColor: colors.primary,
          },
        ]}
        onPress={() => toggleContactSelection(item)}
        activeOpacity={0.7}
      >
        <View style={styles.contactInfo}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.background }]}>
              {item.displayName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.contactDetails}>
            <Text style={[styles.contactName, { color: colors.text }]}>
              {item.displayName || 'Unknown Contact'}
            </Text>
            <Text
              style={[styles.contactPhone, { color: colors.textSecondary }]}
            >
              {item.phoneNumbers?.[0]?.number || 'No phone number'}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.checkbox,
            { borderColor: colors.border },
            isSelected && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
        >
          {isSelected && (
            <MaterialIcons name="check" size={16} color={colors.background} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[
          styles.modalContainer,
          { backgroundColor: colors.background },
        ]}
      >
        {/* Modal Header */}
        <View
          style={[
            styles.modalHeader,
            { borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Share Deal
          </Text>
          <TouchableOpacity
            onPress={clearSelection}
            disabled={selectedCount === 0}
          >
            <Text
              style={[
                styles.clearButton,
                {
                  color:
                    selectedCount > 0
                      ? colors.primary
                      : colors.disabled,
                },
              ]}
            >
              Clear
            </Text>
          </TouchableOpacity>
        </View>

        {/* Deal Badge */}
        <View
          style={[
            styles.dealBadge,
            { backgroundColor: colors.surface },
          ]}
        >
          <View
            style={[
              styles.dealIcon,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.dealEmoji}>🛍️</Text>
          </View>
          <View style={styles.dealBadgeContent}>
            <Text
              style={[styles.dealBadgeTitle, { color: colors.text }]}
            >
              {deal?.business_name || deal?.business || 'Deal'}
            </Text>
            <Text
              style={[
                styles.dealBadgeDescription,
                { color: colors.textSecondary },
              ]}
            >
              {deal?.description ||
                deal?.descrption ||
                'Share this deal with friends'}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.surface },
          ]}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={colors.textPlaceholder}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search contacts..."
            placeholderTextColor={colors.textPlaceholder}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCapitalize="none"
          />
        </View>

        {/* Selected Count */}
        {selectedCount > 0 && (
          <View style={styles.selectedCountContainer}>
            <Text
              style={[
                styles.selectedCountText,
                { color: colors.primary },
              ]}
            >
              {selectedCount} contact{selectedCount !== 1 ? 's' : ''}{' '}
              selected
            </Text>
          </View>
        )}

        {/* Contacts List */}
        <FlatList
          data={filteredContacts}
          keyExtractor={item => item.recordID}
          renderItem={renderContactItem}
          style={styles.contactsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="contacts"
                size={48}
                color={colors.textPlaceholder}
              />
              <Text
                style={[
                  styles.emptyText,
                  { color: colors.textSecondary },
                ]}
              >
                {sharingLoading
                  ? 'Loading contacts...'
                  : searchQuery
                  ? 'No contacts found matching your search'
                  : 'No contacts found'}
              </Text>
              {!sharingLoading && !searchQuery && (
                <TouchableOpacity
                  style={[
                    styles.retryButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={requestContactsAccess}
                >
                  <Text
                    style={[
                      styles.retryButtonText,
                      { color: colors.background },
                    ]}
                  >
                    Refresh Contacts
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />

        {/* Share Button */}
        <View
          style={[
            styles.modalFooter,
            { borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.shareModalButton,
              {
                backgroundColor:
                  canShare && selectedCount > 0
                    ? colors.primary
                    : colors.disabled,
              },
            ]}
            onPress={onShare}
            disabled={
              !canShare || selectedCount === 0 || sharingLoading
            }
          >
            <Text
              style={[
                styles.shareModalButtonText,
                { color: colors.background },
              ]}
            >
              {sharingLoading
                ? 'Sharing...'
                : selectedCount === 0
                ? 'Select contacts to share'
                : `Share with ${selectedCount} contact${
                    selectedCount !== 1 ? 's' : ''
                  }`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  modalTitle: iOSUIKit.title3EmphasizedObject,
  clearButton: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      padding: 8,
    },
  ]),
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 12,
  },
  dealIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dealEmoji: {
    fontSize: 20,
  },
  dealBadgeContent: {
    flex: 1,
  },
  dealBadgeTitle: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      marginBottom: 2,
    },
  ]),
  dealBadgeDescription: StyleSheet.flatten([
    iOSUIKit.subhead,
    {
      lineHeight: 18,
    },
  ]),
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      flex: 1,
      marginLeft: 8,
      paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    },
  ]),
  selectedCountContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  selectedCountText: iOSUIKit.subheadObject,
  contactsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: iOSUIKit.calloutObject,
  contactDetails: {
    flex: 1,
  },
  contactName: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      marginBottom: 2,
    },
  ]),
  contactPhone: iOSUIKit.subheadObject,
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: StyleSheet.flatten([
    iOSUIKit.body,
    {
      textAlign: 'center',
      marginTop: 16,
      marginBottom: 24,
      paddingHorizontal: 32,
    },
  ]),
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  retryButtonText: iOSUIKit.subheadObject,
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  shareModalButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareModalButtonText: iOSUIKit.calloutObject,
});

export default ContactSelectionModal;
