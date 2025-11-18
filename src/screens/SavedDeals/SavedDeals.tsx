import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import { iOSUIKit } from 'react-native-typography';
import VersionFooter from '../../components/VersionFooter';

const SavedDealsScreen = ({ navigation }: any) => {
  const { isDarkMode, deals, heartedDeals } = useAuth();
  const colors = getColors(isDarkMode);
  const [isLoading, setIsLoading] = React.useState(false);

  // Build a list of full deal objects for hearted deals
  const heartedDealIds = new Set((heartedDeals || []).map(d => d.deal_id || d.id));
  const allSavedDeals = deals.filter(deal => heartedDealIds.has(deal.id || deal.deal_id));

  console.log('💾 SavedDeals: allSavedDeals:', allSavedDeals);


  // Filter from SAVED deals only (not all deals) and strictly filter by redemption_status
  const readyToRedeemDeals = allSavedDeals.filter(
    deal => deal.redemption_status && deal.redemption_status.toLowerCase() === 'ready to redeem'
  );

  const redeemedDeals = allSavedDeals.filter(
    deal => deal.redemption_status && deal.redemption_status.toLowerCase() === 'redeemed'
  );

  const almostRedeemedDeals = allSavedDeals.filter(
    deal => {
      if (!deal.redemption_status) return false;
      const status = deal.redemption_status.toLowerCase();
      return status === 'almost there, a few more shares!' || 
             status === 'not enough shares';
    }
  );
  
  // Deals that are hearted but don't have a redemption status yet (newly hearted)
  const newlyHeartedDeals = allSavedDeals.filter(
    deal => !deal.redemption_status || deal.redemption_status.toLowerCase() === ''
  );
  // Show empty state if no saved deals
  if (allSavedDeals.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={[
            styles.header,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}> 
            Saved
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
          >
            <Text style={[iOSUIKit.title3, { color: colors.primary }]}>⚙️</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>💖</Text>
          <Text style={[iOSUIKit.title3Emphasized, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>
            No Saved Deals Yet
          </Text>
          <Text style={[iOSUIKit.body, { color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 }]}>
            Heart deals you love to save them here. Swipe through deals and tap the heart icon!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}> 
          Saved
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Text style={[iOSUIKit.title3, { color: colors.primary }]}>⚙️</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        <Text style={[styles.title, { color: colors.text }]}>Ready To Redeem</Text>
        {isLoading ? (
          <Text style={[iOSUIKit.body, { color: colors.text, textAlign: 'center' }]}>Loading saved deals...</Text>
        ) : readyToRedeemDeals.length === 0 ? (
          <Text style={[iOSUIKit.body, { color: colors.text, textAlign: 'center' }]}>No deals ready to redeem yet.</Text>
        ) : (
          <FlatList
            data={readyToRedeemDeals}
            keyExtractor={item => (item.id || item.deal_id).toString()}
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: colors.card }]}> 
                {item.deal_images && item.deal_images.length > 0 ? (
                  <View>
                    <ImageBackground
                      source={{ uri: item.deal_images[0].image_url }}
                      style={[styles.dealImage, { justifyContent: 'center', alignItems: 'center' }]}
                      imageStyle={{ borderRadius: 8 }}
                    />
                  </View>
                ) : item.deal_image_url ? (
                  <View>
                    <ImageBackground
                      source={{ uri: item.deal_image_url }}
                      style={[styles.dealImage, { justifyContent: 'center', alignItems: 'center' }]}
                      imageStyle={{ borderRadius: 8 }}
                    />
                  </View>
                ) : item.business_images && item.business_images.length > 0 ? (
                  <View>
                    <ImageBackground
                      source={{ uri: item.business_images[0].image_url }}
                      style={[styles.dealImage, { justifyContent: 'center', alignItems: 'center' }]}
                      imageStyle={{ borderRadius: 8 }}
                    />
                  </View>
                ) : (
                  <Text style={styles.dealImage}>{item.image ? item.image : '💖'}</Text>
                )}
                <Text style={[styles.dealTitle, { color: colors.text }]}> 
                  {item.deal_title || item.item || item.offer || item.description || 'Saved Deal'}
                </Text>
                <Text style={[styles.dealBusiness, { color: colors.disabled }]}>{item.business_name || item.business || ''}</Text>
                <Text style={[styles.dealBusiness, { color: colors.secondary }]}>{item.category_name || ''}</Text>
                <Text style={[styles.dealBusiness, { color: colors.text }]}>{item.description || ''}</Text>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.text }]}
                  onPress={() => navigation.navigate('Redemption', { deal: item })}
                >
                  <Text style={[iOSUIKit.subhead, { color: colors.background, fontWeight: 'bold', textAlign: 'center' }]}>View Redemption</Text>
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.list}
            scrollEnabled={false}
          />
        )}
        <Text style={[styles.title, { color: colors.text }]}>Share more to Redeem</Text>
        {isLoading ? (
          <Text style={[iOSUIKit.body, { color: colors.text, textAlign: 'center' }]}>Loading saved deals...</Text>
        ) : (almostRedeemedDeals.length === 0 && newlyHeartedDeals.length === 0) ? (
          <Text style={[iOSUIKit.body, { color: colors.text, textAlign: 'center' }]}>No saved deals yet.</Text>
        ) : (
          <FlatList
            data={[...almostRedeemedDeals, ...newlyHeartedDeals]}
            keyExtractor={item => (item.id || item.deal_id).toString()}
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: colors.card }]}> 
                {item.deal_images && item.deal_images.length > 0 ? (
                  <View>
                    <ImageBackground
                      source={{ uri: item.deal_images[0].image_url }}
                      style={[styles.dealImage, { justifyContent: 'center', alignItems: 'center' }]}
                      imageStyle={{ borderRadius: 8 }}
                    />
                  </View>
                ) : item.deal_image_url ? (
                  <View>
                    <ImageBackground
                      source={{ uri: item.deal_image_url }}
                      style={[styles.dealImage, { justifyContent: 'center', alignItems: 'center' }]}
                      imageStyle={{ borderRadius: 8 }}
                    />
                  </View>
                ) : item.business_images && item.business_images.length > 0 ? (
                  <View>
                    <ImageBackground
                      source={{ uri: item.business_images[0].image_url }}
                      style={[styles.dealImage, { justifyContent: 'center', alignItems: 'center' }]}
                      imageStyle={{ borderRadius: 8 }}
                    />
                  </View>
                ) : (
                  <Text style={styles.dealImage}>{item.image ? item.image : '💖'}</Text>
                )}
                <Text style={[styles.dealTitle, { color: colors.text }]}> 
                  {item.deal_title || item.item || item.offer || item.description || 'Saved Deal'}
                </Text>
                <Text style={[styles.dealBusiness, { color: colors.disabled }]}>{item.business_name || item.business || ''}</Text>
                <Text style={[styles.dealBusiness, { color: colors.secondary }]}>{item.category_name || ''}</Text>
                <Text style={[styles.dealBusiness, { color: colors.text }]}>{item.description || ''}</Text>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.text }]}
                  onPress={() => navigation.navigate('DealDetail', { deal: item })}
                >
                  <Text style={[iOSUIKit.subhead, { color: colors.background, fontWeight: 'bold' }]}>Share More</Text>
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.list}
            scrollEnabled={false}
          />
        )}
        <Text style={[styles.title, { color: colors.text }]}>Redeemed Deals</Text>
        {isLoading ? (
          <Text style={[iOSUIKit.body, { color: colors.text, textAlign: 'center' }]}>Loading saved deals...</Text>
        ) : redeemedDeals.length === 0 ? (
          <Text style={[iOSUIKit.body, { color: colors.text, textAlign: 'center' }]}>No saved deals yet.</Text>
        ) : (
          <FlatList
            data={redeemedDeals}
            keyExtractor={item => (item.deal_id || item.id || Math.random().toString()).toString()}
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: colors.card }]}> 
                {item.deal_images && item.deal_images.length > 0 ? (
                  <View>
                    <ImageBackground
                      source={{ uri: item.deal_images[0].image_url }}
                      style={[styles.dealImage, { justifyContent: 'center', alignItems: 'center' }]}
                      imageStyle={{ borderRadius: 8 }}
                    />
                  </View>
                ) : item.deal_image_url ? (
                  <View>
                    <ImageBackground
                      source={{ uri: item.deal_image_url }}
                      style={[styles.dealImage, { justifyContent: 'center', alignItems: 'center' }]}
                      imageStyle={{ borderRadius: 8 }}
                    />
                  </View>
                ) : item.business_images && item.business_images.length > 0 ? (
                  <View>
                    <ImageBackground
                      source={{ uri: item.business_images[0].image_url }}
                      style={[styles.dealImage, { justifyContent: 'center', alignItems: 'center' }]}
                      imageStyle={{ borderRadius: 8 }}
                    />
                  </View>
                ) : (
                  <Text style={styles.dealImage}>{item.image ? item.image : '💖'}</Text>
                )}
                <Text style={[styles.dealTitle, { color: colors.text }]}> 
                  {item.deal_title || item.item || item.offer || item.description || 'Saved Deal'}
                </Text>
                <Text style={[styles.dealBusiness, { color: colors.disabled }]}>{item.business_name || item.business || ''}</Text>
                <Text style={[styles.dealBusiness, { color: colors.secondary }]}>{item.category_name || ''}</Text>
                <Text style={[styles.dealBusiness, { color: colors.text }]}>{item.description || ''}</Text>
              </View>
            )}
            contentContainerStyle={styles.list}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingBottom: 80, // Add enough padding to sit above bottom nav bar
  },
  title: StyleSheet.flatten([
    iOSUIKit.largeTitleEmphasized,
    {
      marginBottom: 16,
      alignSelf: 'center',
    },
  ]),
  list: {
    alignItems: 'center',
  },
  card: {
    width: 280,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  dealImage: {
    fontSize: 36,
    marginBottom: 8,
    width: 160,
    height: 120,
  },
  dealTitle: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      fontWeight: 'bold',
      marginBottom: 4,
    },
  ]),
  dealBusiness: StyleSheet.flatten([
    iOSUIKit.caption2,
    {
      marginBottom: 8,
    },
  ]),
  button: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
    width: 120,
  },
  redeemed: StyleSheet.flatten([
    iOSUIKit.subhead,
    {
      fontWeight: 'bold',
      marginTop: 8,
    },
  ]),
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50, // Account for status bar
    borderBottomWidth: 1,
  },
  headerTitle: StyleSheet.flatten([
    iOSUIKit.largeTitleEmphasized,
    {
      fontSize: 24, // Override default size for header
    },
  ]),
  settingsButton: {
    padding: 8,
  },
});

export default SavedDealsScreen;
