import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { 
  View, Text, FlatList, Image, TouchableOpacity, 
  StyleSheet, ActivityIndicator, SafeAreaView, TextInput, ScrollView, useColorScheme, Alert, Modal, RefreshControl, Platform, Animated
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// --- 1. GLOBAL CONTEXT ---
const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]); 
  const [shoppingList, setShoppingList] = useState([]);
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  const theme = {
    background: isDark ? '#000000' : '#F8F9FA',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    primary: '#E63946',
    border: isDark ? '#2C2C2E' : '#E5E5EA',
    secondaryText: isDark ? '#8E8E93' : '#636366',
    inputBg: isDark ? '#2C2C2E' : '#E9E9EB',
  };

  const logout = () => { setIsLoggedIn(false); setUserName(""); setFavorites([]); setHistory([]); setShoppingList([]); };
  const addToHistory = (recipe) => setHistory(prev => [recipe, ...prev.filter(i => i.idMeal !== recipe.idMeal)].slice(0, 20));
  const toggleFavorite = (recipe) => setFavorites(prev => prev.find(f => f.idMeal === recipe.idMeal) ? prev.filter(f => f.idMeal !== recipe.idMeal) : [...prev, recipe]);
  const toggleShoppingItem = (item) => setShoppingList(prev => prev.find(i => i.name === item.name) ? prev.filter(i => i.name !== item.name) : [...prev, item]);
  const getCalories = (id) => (parseInt(id.slice(-3)) % 400) + 350;

  return (
    <AppContext.Provider value={{ 
      isLoggedIn, setIsLoggedIn, userName, setUserName, logout, favorites, setFavorites, toggleFavorite, history, addToHistory, 
      shoppingList, setShoppingList, toggleShoppingItem, isDark, setIsDark, theme, getCalories 
    }}>
      {children}
    </AppContext.Provider>
  );
};

// --- 2. WELCOME SCREEN (With Animated Pulse Logo) ---
function WelcomeScreen() {
  const { theme, setUserName, setIsLoggedIn, userName } = useContext(AppContext);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={[styles.center, { backgroundColor: theme.background, padding: 40 }]}>
      <Animated.View style={[styles.logoCircle, { backgroundColor: theme.primary, transform: [{ scale: pulseAnim }] }]}>
        <Ionicons name="restaurant" size={50} color="white" />
      </Animated.View>
      <Text style={[styles.mainHeader, { color: theme.text, marginTop: 30, textAlign: 'center' }]}>Recipe Master</Text>
      <TextInput 
        style={[styles.profileInput, { backgroundColor: theme.inputBg, color: theme.text, marginTop: 40, width: '100%' }]}
        placeholder="Enter your name"
        placeholderTextColor={theme.secondaryText}
        value={userName}
        onChangeText={setUserName}
      />
      <TouchableOpacity 
        style={[styles.minimalBtn, { backgroundColor: theme.primary, width: '100%', marginTop: 20 }]} 
        onPress={() => { if(userName.trim()) setIsLoggedIn(true); else Alert.alert("Wait", "Please enter your name"); }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Start Cooking</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- 3. EXPLORE SCREEN ---
function HomeScreen({ navigation }) {
  const { theme, setIsDark, isDark, favorites, getCalories } = useContext(AppContext);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState(null); 

  const fetchRecipes = async (query = '') => {
    setLoading(true);
    try {
      const res = await fetch(query ? `https://www.themealdb.com/api/json/v1/1/search.php?s=${query}` : `https://www.themealdb.com/api/json/v1/1/search.php?s=`);
      const data = await res.json();
      let results = data.meals || [];

      if (selectedDiet) {
        const filterMap = {
          'Sides': ['Starter', 'Side'],
          'Dessert': ['Dessert'],
          'Non-Veg': ['Beef', 'Chicken', 'Lamb', 'Pork', 'Seafood'],
          'Main Course': ['Beef', 'Chicken', 'Lamb', 'Pork', 'Seafood', 'Pasta', 'Goat'],
          'Vegetarian': ['Vegetarian']
        };
        results = results.filter(m => filterMap[selectedDiet]?.includes(m.strCategory));
      }
      setRecipes(results);
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchRecipes(''); }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.smallLogo, { backgroundColor: theme.primary }]}>
            <Ionicons name="restaurant" size={14} color="white" />
          </View>
          <Text style={[styles.mainHeader, { color: theme.text, marginLeft: 10 }]}>Explore</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ marginRight: 20 }} onPress={() => navigation.navigate('Saved')}>
            <Ionicons name="heart" size={26} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsDark(!isDark)}>
            <Ionicons name={isDark ? "sunny" : "moon"} size={26} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput 
          placeholder="Search recipes..." 
          placeholderTextColor={theme.secondaryText}
          style={[styles.searchBar, { backgroundColor: theme.inputBg, color: theme.text }]}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => fetchRecipes(search)}
        />
        <TouchableOpacity onPress={() => setShowFilter(true)} style={styles.iconBtn}><Ionicons name="options" size={24} color={theme.text} /></TouchableOpacity>
      </View>

      <FlatList 
        data={recipes}
        keyExtractor={item => item.idMeal}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchRecipes(search);}} tintColor={theme.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.9} style={[styles.card, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('Details', { mealId: item.idMeal })}>
            <Image source={{ uri: item.strMealThumb }} style={styles.thumb} />
            <View style={styles.cardContent}>
              <View style={styles.rowBetween}>
                <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>{item.strMeal}</Text>
                <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{getCalories(item.idMeal)} kcal</Text>
              </View>
              <Text style={{ color: theme.secondaryText, fontSize: 13 }}>{item.strCategory} • {item.strArea}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={showFilter} animationType="slide" transparent>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Categories</Text>
          <View style={styles.chipRow}>
            {['Sides', 'Dessert', 'Main Course', 'Non-Veg', 'Vegetarian'].map(d => (
              <TouchableOpacity key={d} onPress={() => setSelectedDiet(d)} style={[styles.chip, { backgroundColor: selectedDiet === d ? theme.primary : theme.inputBg }]}>
                <Text style={{ color: selectedDiet === d ? 'white' : theme.text }}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalActionRow}>
             <TouchableOpacity onPress={() => { setSelectedDiet(null); setShowFilter(false); fetchRecipes(search); }}><Text style={{ color: theme.primary }}>Reset</Text></TouchableOpacity>
             <TouchableOpacity style={[styles.applyBtn, { backgroundColor: theme.primary }]} onPress={() => { setShowFilter(false); fetchRecipes(search); }}><Text style={{ color: 'white', fontWeight: 'bold' }}>Apply</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

// --- 4. CART & HISTORY (EMPTY STATE CHECK) ---
function CartScreen() {
  const { shoppingList, theme, setShoppingList } = useContext(AppContext);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.headerRow}><Text style={[styles.mainHeader, { color: theme.text }]}>Cart</Text>
      {shoppingList.length > 0 && <TouchableOpacity onPress={() => setShoppingList([])}><Text style={{ color: theme.primary }}>Clear</Text></TouchableOpacity>}</View>
      {shoppingList.length === 0 ? (
        <View style={styles.center}><Ionicons name="cart-outline" size={60} color={theme.border} /><Text style={{ color: theme.secondaryText, marginTop: 10 }}>Nothing to see here</Text></View>
      ) : (
        <FlatList data={shoppingList} renderItem={({ item }) => (
          <View style={[styles.cartItem, { borderBottomColor: theme.border }]}><Text style={{ color: theme.text }}>{item.name} ({item.measure})</Text></View>
        )} />
      )}
    </SafeAreaView>
  );
}

function HistoryScreen({ navigation }) {
  const { history, theme } = useContext(AppContext);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.headerRow}><Text style={[styles.mainHeader, { color: theme.text }]}>History</Text></View>
      {history.length === 0 ? (
        <View style={styles.center}><Ionicons name="time-outline" size={60} color={theme.border} /><Text style={{ color: theme.secondaryText, marginTop: 10 }}>Nothing to see here</Text></View>
      ) : (
        <FlatList data={history} renderItem={({ item }) => (
          <TouchableOpacity style={styles.historyRow} onPress={() => navigation.navigate('Details', { mealId: item.idMeal })}>
            <Image source={{ uri: item.strMealThumb }} style={styles.historyThumb} />
            <Text style={{ color: theme.text }}>{item.strMeal}</Text>
          </TouchableOpacity>
        )} />
      )}
    </SafeAreaView>
  );
}

// --- 5. OTHER SCREENS ---
function DetailsScreen({ route }) {
  const { mealId } = route.params;
  const { theme, toggleFavorite, favorites, addToHistory, toggleShoppingItem, shoppingList, getCalories } = useContext(AppContext);
  const [meal, setMeal] = useState(null);

  useEffect(() => {
    fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`)
      .then(res => res.json()).then(data => { if(data.meals) { setMeal(data.meals[0]); addToHistory(data.meals[0]); } });
  }, [mealId]);

  if (!meal) return <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />;

  const ingredients = [];
  for (let i = 1; i <= 20; i++) if (meal[`strIngredient${i}`]) ingredients.push({ name: meal[`strIngredient${i}`], measure: meal[`strMeasure${i}`] });

  return (
    <ScrollView style={{ backgroundColor: theme.background }}>
      <Image source={{ uri: meal.strMealThumb }} style={styles.detailImage} />
      <View style={styles.detailContent}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailTitle, { color: theme.text }]}>{meal.strMeal}</Text>
            <Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold' }}>Est. {getCalories(meal.idMeal)} Calories</Text>
          </View>
          <TouchableOpacity onPress={() => toggleFavorite(meal)}><Ionicons name={favorites.find(f => f.idMeal === meal.idMeal) ? "heart" : "heart-outline"} size={30} color={theme.primary} /></TouchableOpacity>
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Ingredients</Text>
        {ingredients.map((item, idx) => (
          <TouchableOpacity key={idx} style={styles.ingredientRow} onPress={() => toggleShoppingItem(item)}>
            <Text style={{ color: theme.text, flex: 1 }}>{item.name} ({item.measure})</Text>
            <Ionicons name={shoppingList.find(s => s.name === item.name) ? "checkbox" : "add-circle-outline"} size={24} color={theme.primary} />
          </TouchableOpacity>
        ))}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Instructions</Text>
        <Text style={[styles.instructions, { color: theme.secondaryText }]}>{meal.strInstructions}</Text>
      </View>
    </ScrollView>
  );
}

function FavoritesScreen({ navigation }) {
  const { favorites, theme, setFavorites } = useContext(AppContext);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.headerRow}><Text style={[styles.mainHeader, { color: theme.text }]}>Saved</Text>
      <TouchableOpacity onPress={() => setFavorites([])}><Text style={{ color: theme.primary }}>Clear All</Text></TouchableOpacity></View>
      <FlatList data={favorites} numColumns={2} renderItem={({ item }) => (
        <TouchableOpacity style={styles.favCard} onPress={() => navigation.navigate('Details', { mealId: item.idMeal })}>
          <Image source={{ uri: item.strMealThumb }} style={styles.favThumb} />
          <Text numberOfLines={1} style={[styles.favText, { color: theme.text }]}>{item.strMeal}</Text>
        </TouchableOpacity>
      )} />
    </SafeAreaView>
  );
}

function ProfileScreen() {
  const { theme, userName, logout } = useContext(AppContext);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.center, { padding: 30 }]}>
        <Ionicons name="person-circle" size={100} color={theme.primary} />
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: 'bold' }}>{userName}</Text>
        <TouchableOpacity style={[styles.minimalBtn, { backgroundColor: theme.inputBg, marginTop: 40, width: '80%' }]} onPress={logout}>
          <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// --- 6. NAVIGATION ---
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNav() {
  const { theme } = useContext(AppContext);
  return (
    <Tab.Navigator screenOptions={{ 
      headerShown: false, 
      tabBarActiveTintColor: theme.primary,
      tabBarStyle: { backgroundColor: theme.card, borderTopWidth: 0, height: 70, paddingBottom: 12 } 
    }}>
      <Tab.Screen name="Explore" component={HomeScreen} options={{ tabBarIcon: ({color}) => <Ionicons name="compass" size={28} color={color}/> }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarIcon: ({color}) => <Ionicons name="cart" size={28} color={color}/> }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarIcon: ({color}) => <Ionicons name="time" size={28} color={color}/> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({color}) => <Ionicons name="person" size={28} color={color}/> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContext.Consumer>{({ isLoggedIn }) => (
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isLoggedIn ? (
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
            ) : (
              <>
                <Stack.Screen name="Main" component={TabNav} />
                <Stack.Screen name="Details" component={DetailsScreen} />
                <Stack.Screen name="Saved" component={FavoritesScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}</AppContext.Consumer>
    </AppProvider>
  );
}

// --- 7. STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, paddingTop: Platform.OS === 'ios' ? 40 : 50, paddingBottom: 15, alignItems: 'center' },
  mainHeader: { fontSize: 28, fontWeight: '800' },
  searchRow: { flexDirection: 'row', paddingHorizontal: 25, marginBottom: 20, alignItems: 'center' },
  searchBar: { flex: 1, height: 50, borderRadius: 15, paddingHorizontal: 20, fontSize: 16 },
  iconBtn: { marginLeft: 15 },
  card: { marginHorizontal: 25, marginBottom: 20, borderRadius: 25, overflow: 'hidden', elevation: 3, shadowOpacity: 0.1, shadowRadius: 10 },
  thumb: { width: '100%', height: 230 },
  cardContent: { padding: 20 },
  cardTitle: { fontSize: 19, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { padding: 35, borderTopLeftRadius: 35, borderTopRightRadius: 35 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 25 },
  modalActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 35, alignItems: 'center' },
  applyBtn: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 15 },
  profileInput: { height: 60, borderRadius: 15, paddingHorizontal: 20, fontSize: 18, textAlign: 'center' },
  minimalBtn: { paddingVertical: 18, borderRadius: 15, alignItems: 'center' },
  detailImage: { width: '100%', height: 400 },
  detailContent: { padding: 25, borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40, backgroundColor: 'transparent' },
  detailTitle: { fontSize: 28, fontWeight: '800' },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 35, marginBottom: 15 },
  ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: '#ccc' },
  instructions: { lineHeight: 28, fontSize: 17 },
  favCard: { width: '44%', margin: '3%', borderRadius: 20, overflow: 'hidden' },
  favThumb: { width: '100%', height: 140, borderRadius: 20 },
  favText: { marginTop: 10, fontSize: 15, fontWeight: '600', paddingHorizontal: 5 },
  cartItem: { padding: 20, borderBottomWidth: 0.5 },
  historyRow: { flexDirection: 'row', alignItems: 'center', padding: 15, marginHorizontal: 25 },
  historyThumb: { width: 55, height: 55, borderRadius: 15, marginRight: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowOpacity: 0.3, shadowRadius: 10 },
  smallLogo: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }
});