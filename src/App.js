// Google Shopping Debug Version - Updated 2025-05-29
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Download, Check, Search, RefreshCw, Wand2, AlertCircle, Trash2 } from 'lucide-react';
import Papa from 'papaparse';

const App = () => {
  // Thrivera Collection Knowledge Base
  const collectionTags = {
  "Mind and Mood": {
    tags: ["Mind", "Mood", "focus"], // Capitalized to match Shopify
    keywords: ["essential oil", "aromatherapy", "diffuser", "scent", "fragrance", "focus", "concentration", "mental", "clarity", "meditation", "mindfulness", "stress", "anxiety", "mood", "emotional", "calm mind", "mental wellness"]
  },
  "Movement and Flow": {
    tags: ["movement", "mobility", "stretch"], // Removed "flow"
    keywords: ["yoga", "exercise", "fitness", "stretch", "mobility", "movement", "flow", "muscle", "joint", "flexibility", "workout", "active", "physical", "body", "posture", "balance", "strength"]
  },
  "Rest and Sleep": {
    tags: ["Rest", "Sleep", "night"], // Capitalized Rest & Sleep, removed "calm"
    keywords: ["sleep", "night", "bedtime", "pillow", "mattress", "blanket", "rest", "relaxation", "calm", "peaceful", "soothing", "nighttime", "evening", "slumber", "tranquil", "serene"]
  },
  "Supportive Living": {
    tags: ["Safety", "Support", "confidence"], // Capitalized Safety & Support, removed "home"
    keywords: ["support", "safety", "secure", "confidence", "home", "daily living", "independence", "assist", "help", "stability", "reliable", "comfort zone", "protection", "security"]
  },
  "Everyday Comforts": {
    tags: ["comfort", "ease", "cushion"], // Already correct
    keywords: ["comfort", "cushion", "soft", "cozy", "ease", "gentle", "plush", "padded", "ergonomic", "everyday", "daily", "convenient", "simple", "effortless"]
  }
  };
  // Google Shopping Category Mapping
  const googleShoppingData = {
    "Mind and Mood": {
      category: "Health & Beauty > Personal Care > Aromatherapy",
      customLabel0: "Mind-and-Mood",
      customLabel3: "aromatherapy"
    },
    "Movement and Flow": {
      category: "Sporting Goods > Exercise & Fitness",
      customLabel0: "Movement-and-Flow", 
      customLabel3: "fitness"
    },
    "Rest and Sleep": {
      category: "Home & Garden > Decor > Home Fragrance",
      customLabel0: "Rest-and-Sleep",
      customLabel3: "sleep-wellness"
    },
    "Supportive Living": {
      category: "Health & Beauty > Health Care > Mobility & Daily Living Aids",
      customLabel0: "Supportive-Living",
      customLabel3: "daily-living"
    },
    "Everyday Comforts": {
      category: "Home & Garden > Household Supplies",
      customLabel0: "Everyday-Comforts",
      customLabel3: "comfort"
    }
  };
  const isAlreadyEnriched = (product) => {
    const description = (product['Body (HTML)'] || '').toLowerCase();
    const tags = (product.Tags || '').toLowerCase();
    
    const thriveraWords = [
      'mindfully crafted', 'thoughtfully designed', 'gently supports',
      'nurtures you with', 'lovingly made', 'wellness essential'
    ];
    
    const hasThriveraVoice = thriveraWords.some(word => 
      description.includes(word.toLowerCase())
    );
    
    const ourTags = ['mind', 'mood', 'focus', 'movement', 'mobility', 'stretch', 
                     'rest', 'sleep', 'night', 'safety', 'support', 'confidence',
                     'comfort', 'ease', 'cushion'];
    
    const hasOurTags = ourTags.some(tag => tags.includes(tag.toLowerCase()));
    
    return hasThriveraVoice || hasOurTags;
  };


  // Thrivera Brand Voice Templates
  const thriveraVoice = {
    descriptiveWords: ["nurturing", "gentle", "mindfully crafted", "thoughtfully designed", "carefully selected", "lovingly made", "wellness-focused", "naturally inspiring", "beautifully simple", "harmoniously balanced"],
    benefits: ["supports your wellness journey", "enhances your daily rituals", "brings peace to your everyday moments", "nurtures your well-being", "creates moments of tranquility", "supports your natural balance", "encourages mindful living", "promotes inner harmony"],
    closings: ["Embrace wellness, naturally.", "Your journey to balance begins here.", "Designed with your well-being in mind.", "Supporting you every step of the way.", "Where wellness meets everyday living.", "Nurturing your path to inner peace."]
  };

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [processingMode, setProcessingMode] = useState('smart');
  const [processingStats, setProcessingStats] = useState({ 
    total: 0, 
    toProcess: 0, 
    alreadyEnriched: 0 
  });

  // Load settings from localStorage on startup
  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem('thrivera-products');
      if (savedProducts) {
        const parsed = JSON.parse(savedProducts);
        setProducts(parsed);
        setFilteredProducts(parsed);
        console.log('Loaded', parsed.length, 'products from storage');
      }
    } catch (error) {
      console.error('Error loading saved products:', error);
      localStorage.removeItem('thrivera-products');
    }
  }, []);

  // Save products to localStorage whenever products change
  useEffect(() => {
    if (products.length > 0) {
      try {
        localStorage.setItem('thrivera-products', JSON.stringify(products));
        console.log('Saved', products.length, 'products to storage');
      } catch (error) {
        console.error('Error saving products:', error);
      }
    }
  }, [products]);

  // Clear all data
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all products? This cannot be undone.')) {
      setProducts([]);
      setFilteredProducts([]);
      localStorage.removeItem('thrivera-products');
    }
  };

 // Collection Detection Function
  const detectCollection = (title, description) => {
    const text = `${title} ${description}`.toLowerCase();
    
    // Mind and Mood - mental wellness, focus, clarity
    if (text.includes('focus') || text.includes('clarity') || text.includes('mind') || 
        text.includes('mood') || text.includes('meditation') || text.includes('stress') ||
        text.includes('anxiety') || text.includes('calm') || text.includes('mental') ||
        text.includes('cognitive') || text.includes('brain') || text.includes('concentration')) {
      return 'Mind and Mood';
    }
    
    // Rest and Sleep - sleep, rest, relaxation
    if (text.includes('sleep') || text.includes('rest') || text.includes('night') ||
        text.includes('bedtime') || text.includes('pillow') || text.includes('mattress') ||
        text.includes('blanket') || text.includes('relaxation') || text.includes('dream') ||
        text.includes('insomnia') || text.includes('slumber')) {
      return 'Rest and Sleep';
    }
    
    // Movement and Flow - exercise, mobility, physical activity
    if (text.includes('movement') || text.includes('mobility') || text.includes('stretch') ||
        text.includes('exercise') || text.includes('fitness') || text.includes('yoga') ||
        text.includes('flow') || text.includes('flexibility') || text.includes('muscle') ||
        text.includes('joint') || text.includes('physical') || text.includes('active')) {
      return 'Movement and Flow';
    }
    
    // Supportive Living - safety, support, confidence
    if (text.includes('safety') || text.includes('support') || text.includes('confidence') ||
        text.includes('secure') || text.includes('protection') || text.includes('assist') ||
        text.includes('stability') || text.includes('balance') || text.includes('help') ||
        text.includes('aid') || text.includes('therapeutic')) {
      return 'Supportive Living';
    }
    
    // Default to Everyday Comforts
    return 'Everyday Comforts';
  };

  // Generate Thrivera Description - retaining all vendor details
const generateThriveraDescription = async (product, collection) => {
  const originalDesc = (product['Body (HTML)'] || '').replace(/<[^>]*>/g, '').trim();
  
  try {
    const aiDescription = await generateAIDescription(product, collection, originalDesc);
    const finalDescription = ensureThriveraVoice(aiDescription, collection);
    return finalDescription;
    
  } catch (error) {
    console.error('OpenAI generation failed, using fallback:', error);
    return generateFallbackDescription(product, collection, originalDesc);
  }
};
// ADD THIS: OpenAI API function
const generateAIDescription = async (product, collection, originalDesc) => {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not found');
  }

  // Remove this line after debugging - it's exposing your API key!
  // console.log('API Key present:', apiKey ? 'YES' : 'NO', 'Length:', apiKey?.length || 0);

  const collectionGuidance = {
    'Mind and Mood': 'Focus on mental wellness, tranquility, mindfulness, and emotional balance. Use calming, nurturing language.',
    'Movement and Flow': 'Emphasize active wellness, body support, mobility, and movement freedom. Use encouraging, supportive language.',
    'Rest and Sleep': 'Highlight sleep quality, peaceful rest, comfort, and nighttime wellness. Use soothing, gentle language.',
    'Supportive Living': 'Focus on independence, confidence, daily support, and life enhancement. Use empowering, caring language.',
    'Everyday Comforts': 'Emphasize daily comfort, ease of use, gentle support, and everyday wellness. Use warm, comforting language.'
  };

const prompt = `Transform this product description into Thrivera's wellness-focused voice. Keep all specific details like size, color, flavor, scent, material, dimensions, or technical specifications from the original.

Original Product: ${title}
Original Description: ${originalDescription}
Collection: ${collection}

Create a description that:
- Focuses on wellness benefits and how it enhances daily life
- Uses warm, inclusive, supportive language
- Avoids overused words like "indulge" - use alternatives like "enjoy," "embrace," "experience," "savor"
- Keeps ALL specific product details (size, color, flavor, scent, material, etc.)
- Mentions the collection context (${collection})
- Is 2-3 paragraphs, around 150-200 words
- Ends with "Experience the Thrivera difference."

Write only the product description, no titles or extra text.`;

PRODUCT: ${product.Title}
COLLECTION: ${collection}
ORIGINAL: ${originalDesc || 'No description'}

VOICE: Nurturing, mindful, caring. Use "thoughtfully designed," "mindfully crafted," "gently supports."
FOCUS: ${collectionGuidance[collection]}
LENGTH: 2-3 sentences, 50-80 words.

Write now:`;

  console.log('Making OpenAI API request for:', product.Title);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}` // Added .trim() to remove any whitespace
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    console.log('OpenAI Response Status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error Details:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('OpenAI Success for:', product.Title);
    return data.choices[0].message.content.trim();
    
  } catch (error) {
    console.error('OpenAI API Call Failed:', error);
    throw error;
  }
};

// ADD THIS: Voice consistency function
const ensureThriveraVoice = (description, collection) => {
  const voiceTransforms = {
    'high-quality': 'mindfully crafted',
    'premium': 'thoughtfully designed',
    'excellent': 'beautifully crafted',
    'helps': 'gently supports',
    'provides': 'nurtures you with',
    'comfortable': 'gently supportive',
    'effective': 'naturally beneficial',
    'perfect': 'beautifully suited',
    'great': 'wonderfully supportive'
  };

  let enhancedDesc = description;
  
  Object.keys(voiceTransforms).forEach(original => {
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    enhancedDesc = enhancedDesc.replace(regex, voiceTransforms[original]);
  });

  if (!enhancedDesc.trim().endsWith('.')) {
    enhancedDesc += '.';
  }

  return enhancedDesc;
};

// ADD THIS: Fallback function
const generateFallbackDescription = (product, collection) => {
  const productName = product.Title?.toLowerCase() || 'wellness essential';
  
  const fallbackTemplates = {
    'Mind and Mood': `Nurture your mental wellness with this thoughtfully designed ${productName}. Mindfully crafted to support your daily tranquility.`,
    'Movement and Flow': `Support your active lifestyle with this gently effective ${productName}. Beautifully designed to enhance your movement.`,
    'Rest and Sleep': `Create your peaceful sanctuary with this lovingly made ${productName}. Thoughtfully designed to support restful sleep.`,
    'Supportive Living': `Enhance your daily confidence with this reliably supportive ${productName}. Mindfully crafted to nurture your independence.`,
    'Everyday Comforts': `Embrace daily comfort with this gently supportive ${productName}. Thoughtfully designed to enhance your wellness routine.`
  };

  return fallbackTemplates[collection] || fallbackTemplates['Everyday Comforts'];
};
  // Generate SEO Content with Thrivera differentiation
  const generateSEO = (product, collection) => {
    const productName = product.Title?.trim() || product.Handle || 'Wellness Product';
    const seoTitle = `${productName} - Wellness Collection | Thrivera`;
    
    const originalDesc = (product['Body (HTML)'] || '').replace(/<[^>]*>/g, '').trim();
    const firstSentence = originalDesc.split('.')[0] || productName;
    
    let seoDescription = '';
    if (collection === 'Mind and Mood') {
      seoDescription = `Mindfully selected ${productName.toLowerCase()} for mental wellness & emotional balance. ${firstSentence}. `;
    } else if (collection === 'Movement and Flow') {
      seoDescription = `Thoughtfully curated ${productName.toLowerCase()} to support your active wellness journey. ${firstSentence}. `;
    } else if (collection === 'Rest and Sleep') {
      seoDescription = `Carefully chosen ${productName.toLowerCase()} for peaceful rest & restorative sleep. ${firstSentence}. `;
    } else if (collection === 'Supportive Living') {
      seoDescription = `Lovingly selected ${productName.toLowerCase()} to enhance daily confidence & independence. ${firstSentence}. `;
    } else {
      seoDescription = `Wellness-focused ${productName.toLowerCase()} for everyday comfort & well-being. ${firstSentence}. `;
    }
    
    seoDescription += 'Shop Thrivera\'s curated wellness collection.';
    
    return {
      title: seoTitle.length > 60 ? seoTitle.substring(0, 57) + '...' : seoTitle,
      description: seoDescription.length > 160 ? seoDescription.substring(0, 157) + '...' : seoDescription
    };
  };

  // Generate Google Shopping Data
  const generateGoogleShopping = (product, collection) => {
    console.log('Generating Google Shopping data for:', product.Title, 'Collection:', collection);
    const title = (product.Title || '').toLowerCase();
    const price = parseFloat(product['Variant Price']) || 0;
    const vendor = product.Vendor || '';
    
    // Smart gender detection
    let gender = 'unisex';
    if (title.includes('men') && !title.includes('women')) {
      gender = 'male';
    } else if (title.includes('women') && !title.includes('men')) {
      gender = 'female';
    }
    
    // Price range for custom label
    let priceRange = 'budget';
    if (price > 50) priceRange = 'premium';
    else if (price > 25) priceRange = 'mid-range';
    
    // Get collection-specific data
    const shoppingData = googleShoppingData[collection] || googleShoppingData["Everyday Comforts"];
    
    return {
      'Google Shopping / Google Product Category': shoppingData.category,
      'Google Shopping / Gender': gender,
      'Google Shopping / Age Group': 'adult',
      'Google Shopping / Condition': 'new',
      'Google Shopping / Custom Product': 'FALSE',
      'Google Shopping / Custom Label 0': shoppingData.customLabel0,
      'Google Shopping / Custom Label 1': priceRange,
      'Google Shopping / Custom Label 2': vendor.substring(0, 20),
      'Google Shopping / Custom Label 3': shoppingData.customLabel3,
      'Google Shopping / Custom Label 4': 'thrivera-wellness'
    };
  };

 // Process all products automatically
const processAllProducts = useCallback(async () => {
  if (products.length === 0) return;
  
  setProcessing(true);
  setUploadError('');
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Process products one by one to avoid overwhelming the API
    const processedProducts = [];
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        console.log(`Processing product ${i + 1}:`, product.Title);
        
        const detectedCollection = detectCollection(product);
        console.log('Detected collection:', detectedCollection);
        
        const newDescription = await generateThriveraDescription(product, detectedCollection);
        const seoContent = generateSEO(product, detectedCollection);
        
        console.log('About to generate Google Shopping data...');
        const googleShopping = generateGoogleShopping(product, detectedCollection);
        console.log('Google Shopping data generated:', googleShopping);
        
        const newTags = collectionTags[detectedCollection].tags.join(', ');
        
        const result = {
          ...product,
          enriched: true,
          enrichedAt: new Date().toISOString(),
          detectedCollection,
          originalDescription: product['Body (HTML)'] || '',
          originalTags: product.Tags || '',
          originalSeoTitle: product['SEO Title'] || '',
          originalSeoDescription: product['SEO Description'] || '',
          newDescription,
          newTags,
          newSeoTitle: seoContent.title,
          newSeoDescription: seoContent.description,
          ...googleShopping
        };
        
        console.log('Final product result for', product.Title, ':', result);
        processedProducts.push(result);
        
        // Small delay between products to be nice to the API
        if (i < products.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error('Error processing product:', product.Title, error);
        processedProducts.push(product); // Add original product if processing fails
      }
    }
    
    setProducts(processedProducts);
    console.log('Processing completed for', processedProducts.length, 'products');
    
  } catch (error) {
    console.error('Processing error:', error);
    setUploadError('Error processing products: ' + error.message);
  } finally {
    setProcessing(false);
  }
}, [products]);

  // Handle file upload - Fixed for variants
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadError('');

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Please upload a CSV file.');
      return;
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors);
        }

        if (results.data.length === 0) {
          setUploadError('The CSV file appears to be empty.');
          return;
        }

        // Fix variant titles - copy title from first variant to all variants of same product
        const titleMap = new Map();
        
        // First pass: collect titles for each handle
        results.data.forEach((product) => {
          if (product.Handle && product.Title?.trim()) {
            titleMap.set(product.Handle, product.Title.trim());
          }
        });
        
        // Second pass: fill in missing titles
        results.data.forEach((product) => {
          if (product.Handle && (!product.Title || !product.Title.trim())) {
            const savedTitle = titleMap.get(product.Handle);
            if (savedTitle) {
              product.Title = savedTitle;
            }
          }
        });

        const enrichedProducts = results.data.map((product, index) => ({
          ...product,
          id: product.Handle || product.ID || `product_${index}`,
          enriched: false,
          enrichedAt: null
        }));

        setProducts(enrichedProducts);
        setFilteredProducts(enrichedProducts);
        console.log('Uploaded', enrichedProducts.length, 'products');
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        setUploadError('Error reading CSV file: ' + error.message);
      }
    });

    event.target.value = '';
  }, []);

  // Filter and search products
  const applyFilters = useCallback(() => {
    let filtered = products;

    if (filterStatus === 'enriched') {
      filtered = filtered.filter(p => p.enriched);
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter(p => !p.enriched);
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        (p.Title || '').toLowerCase().includes(searchLower) ||
        (p.Handle || '').toLowerCase().includes(searchLower) ||
        (p.Vendor || '').toLowerCase().includes(searchLower) ||
        (p.detectedCollection || '').toLowerCase().includes(searchLower)
      );
    }

    setFilteredProducts(filtered);
  }, [products, filterStatus, searchTerm]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Proper download function for web app
  const downloadFile = (content, filename, contentType = 'text/csv;charset=utf-8;') => {
    try {
      const blob = new Blob([content], { type: contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Download error:', error);
      return false;
    }
  };

  // Export functions - Enhanced with Google Shopping data
  const exportEnrichedData = (includeTracking = false) => {
    if (products.length === 0) {
      alert('No products to export. Please upload and process products first.');
      return;
    }

    const enrichedProducts = products.filter(p => p.enriched);
    if (enrichedProducts.length === 0) {
      alert('No processed products to export. Please process products first.');
      return;
    }

    try {
      const enrichedData = products.map(product => {
        const cleanProduct = { ...product };
        
        // Remove internal tracking fields
        delete cleanProduct.enriched;
        delete cleanProduct.enrichedAt;
        delete cleanProduct.detectedCollection;
        delete cleanProduct.originalDescription;
        delete cleanProduct.originalTags;
        delete cleanProduct.originalSeoTitle;
        delete cleanProduct.originalSeoDescription;
        delete cleanProduct.newDescription;
        delete cleanProduct.newTags;
        delete cleanProduct.newSeoTitle;
        delete cleanProduct.newSeoDescription;
        delete cleanProduct.id;
        
        // Update Shopify fields with enriched content
        if (product.enriched) {
          cleanProduct['Body (HTML)'] = product.newDescription || product.originalDescription;
          cleanProduct['Tags'] = product.newTags || product.originalTags;
          cleanProduct['SEO Title'] = product.newSeoTitle || product.originalSeoTitle;
          cleanProduct['SEO Description'] = product.newSeoDescription || product.originalSeoDescription;
          
          // Add Google Shopping fields
          cleanProduct['Google Shopping / Google Product Category'] = product['Google Shopping / Google Product Category'] || '';
          cleanProduct['Google Shopping / Gender'] = product['Google Shopping / Gender'] || '';
          cleanProduct['Google Shopping / Age Group'] = product['Google Shopping / Age Group'] || '';
          cleanProduct['Google Shopping / Condition'] = product['Google Shopping / Condition'] || '';
          cleanProduct['Google Shopping / Custom Product'] = product['Google Shopping / Custom Product'] || '';
          cleanProduct['Google Shopping / Custom Label 0'] = product['Google Shopping / Custom Label 0'] || '';
          cleanProduct['Google Shopping / Custom Label 1'] = product['Google Shopping / Custom Label 1'] || '';
          cleanProduct['Google Shopping / Custom Label 2'] = product['Google Shopping / Custom Label 2'] || '';
          cleanProduct['Google Shopping / Custom Label 3'] = product['Google Shopping / Custom Label 3'] || '';
          cleanProduct['Google Shopping / Custom Label 4'] = product['Google Shopping / Custom Label 4'] || '';
        }
        
        if (includeTracking) {
          cleanProduct['Enrichment Status'] = product.enriched ? 'Enriched' : 'Pending';
          cleanProduct['Detected Collection'] = product.detectedCollection || '';
          cleanProduct['Enriched Date'] = product.enrichedAt || '';
        }
        
        return cleanProduct;
      });

      const csv = Papa.unparse(enrichedData, {
        header: true,
        skipEmptyLines: true,
        quotes: false
      });
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = includeTracking ? 
        `thrivera_products_with_tracking_${timestamp}.csv` :
        `thrivera_shopify_import_${timestamp}.csv`;
      
      const success = downloadFile(csv, filename);
      
      if (success) {
        console.log('Export completed:', filename);
        const message = includeTracking ? 
          `✅ Tracking export completed! Downloaded: ${filename}` :
          `✅ Shopify import file ready! Downloaded: ${filename}`;
        
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 10000;
          background: #059669; color: white; padding: 16px 24px;
          border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          font-size: 14px; max-width: 400px;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 4000);
      } else {
        alert('Export failed. Please check your browser settings and try again.');
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    }
  };

  const enrichedCount = products.filter(p => p.enriched).length;
  const totalCount = products.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
             <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
  🌿 Thrivera Product Enrichment
  </h1>
<p className="text-gray-600">Automatically transform vendor product descriptions into consistent Thrivera wellness voice, assign collection tags, and optimize for Google Shopping.</p>

{/* Processing Mode Section */}
<div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
  <h3>Processing Mode</h3>
  
  <label style={{ display: 'block', marginBottom: '10px' }}>
    <input 
      type="radio" 
      value="smart" 
      checked={processingMode === 'smart'}
      onChange={(e) => setProcessingMode(e.target.value)}
    />
    Smart Mode - Skip already enriched products
  </label>
  
  <label style={{ display: 'block', marginBottom: '10px' }}>
    <input 
      type="radio" 
      value="force" 
      checked={processingMode === 'force'}
      onChange={(e) => setProcessingMode(e.target.value)}
    />
    Force All - Reprocess everything
  </label>
</div>
</div>

    {/* Your existing content continues here... */}
   
              <p className="text-gray-600">Automatically transform vendor product descriptions into consistent Thrivera wellness voice, assign collection tags, and optimize for Google Shopping.</p>
            </div>
            {totalCount > 0 && (
              <button
                onClick={clearAllData}
                className="text-red-600 hover:text-red-800 flex items-center gap-2 text-sm"
                title="Clear all products"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Upload & Process</h2>
            {totalCount > 0 && (
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {enrichedCount} of {totalCount} products processed ({Math.round((enrichedCount/totalCount) * 100)}%)
              </div>
            )}
          </div>
          
          {uploadError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-red-800">{uploadError}</span>
            </div>
          )}
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-thrivera-green transition-colors">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Upload your Shopify CSV to begin automatic processing
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Supports standard Shopify product export format
              </span>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          
          {products.length > 0 && !enrichedCount && (
            <div className="mt-6 text-center">
              <button
                onClick={processAllProducts}
                disabled={processing}
                className="bg-thrivera-green text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed flex items-center gap-2 mx-auto transition-colors"
              >
                {processing ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Processing {totalCount} Products...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" />
                    Process All Products with Thrivera Voice + Google Shopping
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Collection Knowledge Base */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🏷️ Thrivera Collections & Google Shopping</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(collectionTags).map(([collection, data]) => (
                <div key={collection} className="bg-thrivera-light border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">{collection}</h3>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {data.tags.map(tag => (
                      <span key={tag} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-green-700 mb-1">
                    Auto-detected by: {data.keywords.slice(0, 3).join(', ')}...
                  </p>
                  <p className="text-xs text-blue-700">
                    Google Category: {googleShoppingData[collection]?.category.split(' > ').pop()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        {enrichedCount > 0 && (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-thrivera-green"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-thrivera-green"
                  >
                    <option value="all">All Products</option>
                    <option value="enriched">Processed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportEnrichedData(false)}
                    className="bg-thrivera-green text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export for Shopify
                  </button>
                  <button
                    onClick={() => exportEnrichedData(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export with Tracking
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Processed Products ({filteredProducts.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
               {filteredProducts.length === 0 ? (
                 <div className="p-6 text-center text-gray-500">
                   {searchTerm || filterStatus !== 'all' ? 'No products match your search criteria.' : 'No processed products to display.'}
                 </div>
               ) : (
                filteredProducts.map((product, index) => (
  <div key={`${product.id}-${index}`} className="p-6">
                     <div className="flex items-start justify-between mb-4">
                       <div className="flex-1">
                         <div className="flex items-center gap-3 mb-2">
                           <h3 className="text-lg font-medium text-gray-900">
                             {product.Title?.trim() || product.Handle || `Product ${product.id || 'Unknown'}`}
                           </h3>
                           {product.enriched && (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                               <Check className="h-3 w-3 mr-1" />
                               {product.detectedCollection}
                             </span>
                           )}
                         </div>
                         
                         {product.Vendor && (
                           <p className="text-sm text-gray-500 mb-2">Vendor: {product.Vendor}</p>
                         )}
                         
                         {product.enriched && (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                             {/* Original */}
                             <div>
                               <h4 className="text-sm font-medium text-gray-700 mb-2">Original Description</h4>
                               <div className="bg-gray-50 border rounded-md p-3 text-sm text-gray-600 max-h-32 overflow-y-auto">
                                 {product.originalDescription.replace(/<[^>]*>/g, '') || 'No description'}
                               </div>
                             </div>
                             
                             {/* Thrivera Version */}
                             <div>
                               <h4 className="text-sm font-medium text-green-700 mb-2">Thrivera Description</h4>
                               <div className="bg-thrivera-light border border-green-200 rounded-md p-3 text-sm text-green-800 max-h-32 overflow-y-auto">
                                 {product.newDescription}
                               </div>
                             </div>
                             
                             {/* Tags & SEO */}
                             <div>
                               <h4 className="text-sm font-medium text-gray-700 mb-2">Collection Tags</h4>
                               <div className="flex flex-wrap gap-1">
                                 {product.newTags.split(', ').map(tag => (
                                   <span key={tag} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                     {tag}
                                   </span>
                                 ))}
                               </div>
                             </div>
                             
                             <div>
                               <h4 className="text-sm font-medium text-gray-700 mb-2">SEO Content</h4>
                               <div className="text-xs text-gray-600 space-y-1">
                                 <div><strong>Title:</strong> {product.newSeoTitle}</div>
                                 <div><strong>Description:</strong> {product.newSeoDescription}</div>
                               </div>
                             </div>

                             {/* Google Shopping Data */}
                             <div className="lg:col-span-2">
                               <h4 className="text-sm font-medium text-blue-700 mb-2">Google Shopping Data</h4>
                               <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800 space-y-1">
                                 <div><strong>Category:</strong> {product['Google Shopping / Google Product Category']}</div>
                                 <div><strong>Gender:</strong> {product['Google Shopping / Gender']} | <strong>Condition:</strong> {product['Google Shopping / Condition']}</div>
                                 <div><strong>Labels:</strong> {product['Google Shopping / Custom Label 0']}, {product['Google Shopping / Custom Label 1']}, {product['Google Shopping / Custom Label 4']}</div>
                               </div>
                             </div>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 ))
               )}
             </div>
           </div>
         </>
       )}

       {/* Footer */}
       <div className="mt-8 text-center text-sm text-gray-500">
         <p>Thrivera Product Enrichment Tool - Built with wellness in mind 🌿</p>
       </div>
     </div>
);
};

export default App;