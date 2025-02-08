import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from "@/constants/api";

type RecommendedDish = {
  name: string;
  reason: string;
  warning?: string;
};

type NotRecommendedDish = {
  name: string;
  reason: string;
};

type OtherOption = {
  name: string;
  notes?: string;
};

type MenuAnalysis = {
  recommendations: RecommendedDish[];
  notRecommended: NotRecommendedDish[];
  otherOptions: OtherOption[];
};

const STORAGE_KEY = '@menumind_preferences';

const RecommendationsView = ({ analysis, onRegenerate, onNewScan }: {
  analysis: MenuAnalysis;
  onRegenerate: () => void;
  onNewScan: () => void;
}) => {
  return (
    <ScrollView style={styles.recommendationsContainer}>
      {/* Top Recommendations */}
      <Text style={styles.sectionTitle}>Recommended Dishes</Text>
      {analysis.recommendations.map((dish, index) => (
        <View key={index} style={styles.recommendationCard}>
          <Text style={styles.dishName}>{dish.name}</Text>
          <Text style={styles.dishReason}>{dish.reason}</Text>
          {dish.warning && (
            <View style={styles.warningContainer}>
            <MaterialIcons name="warning" size={16} color="#92400e" />
            <Text style={styles.warningText}>{dish.warning}</Text>
          </View>
          )}
        </View>
      ))}

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          style={[styles.buttonBase, styles.buttonPrimary]}
          onPress={onRegenerate}
        >
          <Text style={styles.buttonTextPrimary}>Regenerate Options</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.buttonBase, styles.buttonSecondary]}
          onPress={onNewScan}
        >
          <Text style={styles.buttonTextSecondary}>Scan Another Menu</Text>
        </TouchableOpacity>
      </View>

      {/* Not Recommended Section */}
      <Text style={[styles.sectionTitle, styles.notRecommendedTitle]}>Not Recommended</Text>
      {analysis.notRecommended.map((dish, index) => (
        <View key={index} style={styles.notRecommendedCard}>
          <Text style={styles.notRecommendedName}>{dish.name}</Text>
          <Text style={styles.notRecommendedReason}>{dish.reason}</Text>
        </View>
      ))}

      {/* Other Options Section */}
      <Text style={styles.sectionTitle}>Other Menu Items</Text>
      {analysis.otherOptions.map((dish, index) => (
        <View key={index} style={styles.otherOptionCard}>
          <Text style={styles.otherOptionName}>{dish.name}</Text>
          {dish.notes && (
            <Text style={styles.otherOptionNotes}>{dish.notes}</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

export default function Index() {
  const [showCamera, setShowCamera] = useState(false);
  const [menuImage, setMenuImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MenuAnalysis | null>(null);

  // Add this effect to reanalyze when returning to screen
  useFocusEffect(
    React.useCallback(() => {
      if (menuImage) {
        console.log('Screen focused with menu image, reanalyzing...');
        analyzeMenu();
      }
    }, [menuImage])
  );

  useEffect(() => {
    if (menuImage) {
      console.log('menuImage changed, starting analysis');
      analyzeMenu();
    }
  }, [menuImage]);

  const loadPreferences = async () => {
    try {
      console.log('Loading preferences...');
      const savedPreferences = await AsyncStorage.getItem(STORAGE_KEY);
      const preferences = savedPreferences ? JSON.parse(savedPreferences) : {
        neverFoods: [],
        dislikedFoods: [],
        favoriteFoods: []
      };
      console.log('Loaded preferences:', preferences);
      return preferences;
    } catch (error) {
      console.error('Error loading preferences:', error);
      return {
        neverFoods: [],
        dislikedFoods: [],
        favoriteFoods: []
      };
    }
  };

  const takePhoto = async () => {
    console.log('Starting takePhoto');
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert("You need to enable camera permissions to take a photo!");
      return;
    }
    console.log('Got camera permission');

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
      aspect: [4, 3],
    });

    console.log('Camera result:', result);
    if (!result.canceled) {
      console.log('Setting image:', result.assets[0].uri);
      setMenuImage(result.assets[0].uri);
    } else {
      console.log('Camera cancelled');
    }
  };

  const pickImage = async () => {
    console.log('Starting pickImage');
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.5,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setMenuImage(result.assets[0].uri);
    }
  };

  const analyzeMenu = async () => {
    setIsAnalyzing(true);
    try {
      if (!menuImage) {
        throw new Error('No image to analyze');
      }
      // Load fresh preferences right before analysis
    const preferences = await loadPreferences();
    console.log('Using preferences for analysis:', preferences);

      const response = await fetch(menuImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('image', {
        uri: menuImage,
        type: 'image/jpeg',
        name: 'menu.jpg'
      } as any);
      formData.append('preferences', JSON.stringify(preferences));

      console.log("Making request to:", `${API_URL}/api/analyze-menu`);
      const analysisResponse = await fetch(`${API_URL}/api/analyze-menu`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        throw new Error(`Server error: ${analysisResponse.status} - ${errorText}`);
      }
    
      const analysisData = await analysisResponse.json();
      console.log("Response received:", analysisData);

      // Validate the response structure
      if (!analysisData || typeof analysisData !== 'object') {
        throw new Error('Invalid response format: Not an object');
      }

      if (!Array.isArray(analysisData.recommendations) || 
        !Array.isArray(analysisData.notRecommended) || 
        !Array.isArray(analysisData.otherOptions)) {
        console.error('Invalid response structure:', analysisData);
        throw new Error('Invalid response format: Missing required arrays');
      }

      // Validate at least some recommendations are present
      if (analysisData.recommendations.length === 0) {
        throw new Error('No recommendations received');
      }

      // Type guard to ensure the structure matches MenuAnalysis
      const isValidAnalysis = (data: any): data is MenuAnalysis => {
        return data.recommendations.every((rec: any) => 
          typeof rec.name === 'string' && 
          typeof rec.reason === 'string'
        ) &&
        data.notRecommended.every((item: any) =>
          typeof item.name === 'string' &&
          typeof item.reason === 'string'
        ) &&
        data.otherOptions.every((item: any) =>
          typeof item.name === 'string' &&
          (item.notes === undefined || typeof item.notes === 'string')
        );
      };

      if (!isValidAnalysis(analysisData)) {
        throw new Error('Invalid response format: Data structure mismatch');
      }

        setAnalysis(analysisData);
    } catch (error: any) {
      console.error('Error analyzing menu:', error);
      alert(`Failed to analyze menu: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      {!showCamera && !menuImage && !analysis ? (
        <TouchableOpacity 
          style={[styles.buttonBase, styles.buttonPrimary]}
          onPress={() => setShowCamera(true)}
        >
          <Text style={[styles.buttonTextBase, styles.buttonTextPrimary]}>
            Scan a Menu
          </Text>
        </TouchableOpacity>
      ) : showCamera && !menuImage ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.buttonBase, styles.buttonPrimary]} 
            onPress={takePhoto}
          >
            <Text style={[styles.buttonTextBase, styles.buttonTextPrimary]}>
              Take Photo of Menu
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.orText}>or</Text>
          
          <TouchableOpacity 
            style={[styles.buttonBase, styles.buttonPrimary]} 
            onPress={pickImage}
          >
            <Text style={[styles.buttonTextBase, styles.buttonTextPrimary]}>
              Choose from Library
            </Text>
          </TouchableOpacity>
        </View>
      ) : menuImage && !analysis ? (
        <View style={styles.resultContainer}>
          <Image 
            source={{ uri: menuImage }} 
            style={styles.menuImage} 
          />
          
          {isAnalyzing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Analyzing menu...</Text>
            </View>
          )}
        </View>
      ) : analysis ? (
        <RecommendationsView
          analysis={analysis}
          onRegenerate={() => {
            setAnalysis(null);
            analyzeMenu();
          }}
          onNewScan={() => {
            setMenuImage(null);
            setAnalysis(null);
            setShowCamera(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Base container styles
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  buttonGroup: {
    width: '80%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    alignSelf: 'center',
  },

  // Button styles
  buttonBase: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 'auto',
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderColor: '#007AFF',
  },
  buttonTextBase: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#fff',
  },
  buttonTextSecondary: {
    color: '#007AFF',
  },

  // Other UI elements
  orText: {
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
  },
  menuImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginTop: 20,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  recommendationsContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  notRecommendedTitle: {
    marginTop: 24,
  },
  notRecommendedCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  notRecommendedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
  },
  notRecommendedReason: {
    fontSize: 14,
    color: '#991b1b',
    marginTop: 4,
  },
  otherOptionCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  otherOptionName: {
    fontSize: 16,
    fontWeight: '500',
  },
  otherOptionNotes: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  recommendation: {
    width: '100%',
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 10,
  },
  dishName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  dishReason: {
    fontSize: 14,
    color: '#666',
  },

  // Error and validation styles
  errorContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#FFE5E5',
    borderRadius: 10,
    marginBottom: 10,
  },
  errorText: {
    color: '#D00',
    fontSize: 14,
  },
  validationWarning: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
  },
  validationWarningText: {
    color: '#E65100',
    fontSize: 14,
  },

  // Loading overlay styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingSubText: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});