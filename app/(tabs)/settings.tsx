import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage.clear();

type PreferenceItem = {
  id: string;
  text: string;
};

type PreferenceState = {
  restrictedFoods: PreferenceItem[];
  dislikedFoods: PreferenceItem[];
  favoriteFoods: PreferenceItem[];
};

const STORAGE_KEY = '@menumind_preferences';

const PreferenceSection = ({
  title,
  description,
  category,
  items,
  onAdd,
  onRemove,
  onEdit,
  inputValue,
  setInputValue,
  placeholder
}: {
  title: string;
  description?: string;
  category: keyof PreferenceState;
  items: PreferenceItem[];
  onAdd: (text: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  inputValue: string;
  setInputValue: (text: string) => void;
  placeholder: string;
}) => {
  const validateItem = (text: string) => {
    if (!text.trim()) {
      Alert.alert('Invalid Input', 'Please enter some text');
      return false;
    }

    if (items && Array.isArray(items)) {
      const isDuplicate = items.some(
        item => item.text.toLowerCase() === text.trim().toLowerCase()
      );
      if (isDuplicate) {
        Alert.alert('Duplicate Item', 'This item already exists in the list');
        return false;
      }
    }
  
    return true;
  };

  const handleAdd = () => {
    if (validateItem(inputValue)) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description && (
        <Text style={styles.sectionDescription}>{description}</Text>
      )}
      
      <View style={styles.itemsContainer}>
        {items && items.length > 0 ? items.map((item) => (
          <View key={item.id} style={styles.item}>
            <TouchableOpacity 
              onLongPress={() => onEdit(item.id)}
              style={styles.itemTextContainer}
            >
              <Text style={styles.itemText}>{item.text}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => onRemove(item.id)}
              style={styles.removeButton}
            >
              <MaterialIcons name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        )) : null}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={placeholder}
          onSubmitEditing={handleAdd}
          blurOnSubmit={false}
        />
        <TouchableOpacity 
          onPress={handleAdd}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function Settings() {
  const [preferences, setPreferences] = useState<PreferenceState>({
    restrictedFoods: [],
    dislikedFoods: [],
    favoriteFoods: []
  });

  const [newRestrictedFood, setnewRestrictedFood] = useState('');
  const [newDislikedFood, setNewDislikedFood] = useState('');
  const [newFavoriteFood, setNewFavoriteFood] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const savedPreferences = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences);
        // Handle migration from old format to new format
        const migratedPreferences = {
          restrictedFoods: parsed.restrictedFoods || [],
          dislikedFoods: parsed.dislikedFoods || parsed.limitedFoods || [], // Check for both new and old keys
          favoriteFoods: parsed.favoriteFoods || []
        };
        setPreferences(migratedPreferences);
        // Save the migrated format back to storage
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migratedPreferences));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async (newPreferences: PreferenceState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const addItem = useCallback(
    (
      text: string,
      category: keyof PreferenceState,
      setText: React.Dispatch<React.SetStateAction<string>>
    ) => {
      if (!text.trim()) return;
      
      setPreferences(prev => {
        const newPreferences = {
          ...prev,
          [category]: [...prev[category], { 
            id: Date.now().toString(), 
            text: text.trim() 
          }]
        };
        savePreferences(newPreferences);
        return newPreferences;
      });
      
      setText('');
    },
    [savePreferences]
  );

  const removeItem = (id: string, category: keyof PreferenceState) => {
    setPreferences(prev => {
      const newPreferences = {
        ...prev,
        [category]: prev[category].filter(item => item.id !== id)
      };
      savePreferences(newPreferences);
      return newPreferences;
    });
  };

  const editItem = (id: string, newText: string, category: keyof PreferenceState) => {
    setPreferences(prev => {
      const newPreferences = {
        ...prev,
        [category]: prev[category].map(item =>
          item.id === id ? { ...item, text: newText.trim() } : item
        )
      };
      savePreferences(newPreferences);
      return newPreferences;
    });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView 
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        
        <PreferenceSection
          title="Dietary Restrictions"
          description="Foods that you never want to eat due to allergies, restrictions, or unbridled hatred"
          category="restrictedFoods"
          onAdd={(text) => addItem(text, "restrictedFoods", setnewRestrictedFood)}
          onRemove={(id) => removeItem(id, "restrictedFoods")}
          onEdit={(id) => editItem(id, newRestrictedFood, "restrictedFoods")}
          inputValue={newRestrictedFood}
          setInputValue={setnewRestrictedFood}
          placeholder="Add a food restriction..."
          items={preferences.restrictedFoods}
        />

        <PreferenceSection
          title="Foods to Avoid"
          description="Foods that you prefer to avoid but can eat occasionally"
          category="dislikedFoods"
          onAdd={(text) => addItem(text, "dislikedFoods", setNewDislikedFood)}
          onRemove={(id) => removeItem(id, "dislikedFoods")}
          onEdit={(id) => editItem(id, newDislikedFood, "dislikedFoods")}
          inputValue={newDislikedFood}
          setInputValue={setNewDislikedFood}
          placeholder="Add a food to avoid..."
          items={preferences.dislikedFoods}
        />
        
        <PreferenceSection
          title="Foods You Love"
          description='Foods you enjoy! Try entering categories of food ("chicken") as well as specific dishes ("pad thai") you like'
          category="favoriteFoods"
          onAdd={(text) => addItem(text, "favoriteFoods", setNewFavoriteFood)}
          onRemove={(id) => removeItem(id, "favoriteFoods")}
          onEdit={(id) => editItem(id, newFavoriteFood, "favoriteFoods")}
          inputValue={newFavoriteFood}
          setInputValue={setNewFavoriteFood}
          placeholder="Add a favorite food..."
          items={preferences.favoriteFoods}
        />

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  mainSectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 24,
    color: '#007AFF',
  },
  section: {
    marginBottom: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  item: {
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  itemTextContainer: {
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 16,
    marginRight: 4,
  },
  removeButton: {
    padding: 4,
    marginLeft: 4,
    justifyContent: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});