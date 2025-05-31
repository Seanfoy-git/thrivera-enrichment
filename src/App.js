// Google Shopping Debug Version - Updated 2025-05-29
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Download, Check, Search, RefreshCw, Wand2, AlertCircle, Trash2 } from 'lucide-react';
import Papa from 'papaparse';

const App = () => {
  // Thrivera Collection Knowledge Base
  const collectionTags = {
    "Mind and Mood": {
      tags: ["Mind", "Mood", "focus"],
      keywords: ["essential oil", "aromatherapy", "diffuser", "scent", "fragrance", "focus", "concentration", "mental", "clarity", "meditation", "mindfulness", "stress", "anxiety", "mood", "emotional", "calm mind", "mental wellness"]
    },
    "Movement and Flow": {
      tags: ["movement", "mobility", "stretch"],
      keywords: ["yoga", "exercise", "fitness", "stretch", "mobility", "movement", "flow", "muscle", "joint", "flexibility", "workout", "active", "physical", "body", "posture", "balance", "strength"]
    },
    "Rest and Sleep": {
      tags: ["Rest", "Sleep", "night"],
      keywords: ["sleep", "night", "bedtime", "pillow", "mattress", "blanket", "rest", "relaxation", "calm", "peaceful", "soothing", "nighttime", "evening", "slumber", "tranquil", "serene"]
    },
    "Supportive Living": {
      tags: ["Safety", "Support", "confidence"],
      keywords: ["support", "safety", "secure", "confidence", "home", "daily living", "independence", "assist", "help", "stability", "reliable", "comfort zone", "protection", "security"]
    },
    "Everyday Comforts": {
      tags: ["comfort", "ease", "cushion"],
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
    current: 0,
    currentProduct: '',
    toProcess: 0, 
    alreadyEnriched: 0 
  });
  const [cancelProcessing, setCancelProcessing] = useState(false);

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

  // OpenAI API function
  const generateAIDescription = async (product, collection, originalDesc) => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const prompt = `Transform this product description into Thrivera's wellness-focused voice. Keep all specific details like size, color, flavor, scent, material, dimensions, or technical specifications from the original.

Original Product: ${product.Title}
Original Description: ${originalDesc}
Collection: ${collection}

IMPORTANT: DO NOT start with "Indulge" - this word is overused. Instead start with: "Discover," "Experience," "Embrace," "Enjoy," "Find," "Create," or "Welcome."

Create a description that:
- NEVER starts with "Indulge" or uses "indulge" anywhere
- Focuses on wellness benefits and how it enhances daily life
- Uses warm, inclusive, supportive language
- Uses varied opening words like "Discover," "Experience," "Embrace," "Enjoy," "Find," "Create"
- Keeps ALL specific product details (size, color, flavor, scent, material, etc.)
- Mentions the collection context (${collection})
- Is 2-3 paragraphs, around 150-200 words
- Ends with "Experience the Thrivera difference."

Write only the product description, no titles or extra text.`;
    
    console.log('Making OpenAI API request for:', product.Title);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
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

  // Voice consistency function
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

  // Fallback function
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
    setCancelProcessing(false);
    
    // Determine which products to process based on mode
    let productsToProcess = [];
    if (processingMode === 'smart') {
      productsToProcess = products.filter(product => !isAlreadyEnriched(product));
      console.log(`Smart mode: Processing ${productsToProcess.length} of ${products.length} products`);
    } else {
      productsToProcess = products;
      console.log(`Force mode: Processing all ${products.length} products`);
    }
    
    // Initialize progress tracking
    setProcessingStats({
      total: productsToProcess.length,
      current: 0,
      currentProduct: '',
      toProcess: productsToProcess.length,
      alreadyEnriched: products.length - productsToProcess.length
    });
    
    if (productsToProcess.length === 0) {
      setUploadError('All products are already enriched! Use "Force All" mode to reprocess everything.');
      setProcessing(false);
      return;
    }
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Process products one by one to avoid overwhelming the API
      const processedProducts = [...products]; // Start with all existing products
      
      for (let i = 0; i < productsToProcess.length; i++) {
        // Check if user cancelled - THIS IS THE FIX
        if (cancelProcessing) {
          console.log('Processing cancelled by user at product', i + 1);
          setUploadError('Processing was cancelled by user.');
          break;
        }
        
        const product = productsToProcess[i];
        
        // Update progress - THIS IS THE FIX
        setProcessingStats(prev => ({
          ...prev,
          current: i + 1,
          currentProduct: product.Title || `Product ${i + 1}`
        }));
        
        // Allow React to update the UI
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          console.log(`Processing product ${i + 1}:`, product.Title);
          
          const detectedCollection = detectCollection(product.Title, product['Body (HTML)'] || '');
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
          
          // Find the product in the main array and update it
          const productIndex = processedProducts.findIndex(p => p.id === product.id);
          if (productIndex !== -1) {
            processedProducts[productIndex] = result;
          }
          
          // Update products state immediately so user can see progress
          setProducts([...processedProducts]);
          
          console.log('Final product result for', product.Title, ':', result);
          
          // Small delay between products to be nice to the API
          if (i < productsToProcess.length - 1 && !cancelProcessing) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          console.error('Error processing product:', product.Title, error);
          // Keep the original product if processing fails
        }
      }
      
      setProducts(processedProducts);
      console.log('Processing completed for', processedProducts.filter(p => p.enriched).length, 'products');
      
    } catch (error) {
      console.error('Processing error:', error);
      setUploadError('Error processing products: ' + error.message);
    } finally {
      setProcessing(false);
      setCancelProcessing(false);
      setProcessingStats({ total: 0, current: 0, currentProduct: '', toProcess: 0, alreadyEnriched: 0 });
    }
  }, [products, cancelProcessing, processingMode]);

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
              <p className="text-gray-600">
                Automatically transform vendor product descriptions into consistent Thrivera wellness voice, assign collection tags, and optimize for Google Shopping.
              </p>

              {/* Processing Mode Section */}
              <div className="bg-gray-50 p-5 rounded-lg mt-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Processing Mode</h3>
                
              {/* Processing Mode Section */}
              <div className="bg-gray-50 p-5 rounded-lg mt-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Processing Mode</h3>
                
                <label className="flex items-center mb-3 cursor-pointer">
                  <input 
                    type="radio" 
                    value="smart" 
                    checked={processingMode === 'smart'}
                    onChange={(e) => setProcessingMode(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">Smart Mode</span>
                    <p className="text-sm text-gray-600">Skip products that already have Thrivera voice or collection tags</p>
                  </div>
          
          {products.length > 0 && !processing && (
            <div className="mt-6 text-center">
              <button
                onClick={processAllProducts}
                className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 flex items-center gap-2 mx-auto transition-colors"
              >
                <Wand2 className="h-5 w-5" />
                Process Products with Thrivera Voice + Google Shopping
              </button>
            </div>
          )}

          {processing && (
            <div className="mt-6">
              <div className="flex flex-col items-center gap-4">
                {/* Progress Bar */}
                <div className="w-full max-w-lg">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Processing Products</span>
                    <span>{processingStats.current} of {processingStats.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-600 h-4 rounded-full transition-all duration-500 ease-out" 
                      style={{ 
                        width: `${processingStats.total > 0 ? Math.round((processingStats.current / processingStats.total) * 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-600 mt-3 text-center">
                    {processingStats.currentProduct && (
                      <span>Currently processing: <strong>{processingStats.currentProduct}</strong></span>
                    )}
                  </div>
                </div>
                
                {/* Status */}
                <div className="flex items-center gap-2 text-green-600">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>
                    {processingStats.total > 0 ? Math.round((processingStats.current / processingStats.total) * 100) : 0}% complete 
                    ({processingStats.current} of {processingStats.total} products)
                  </span>
                </div>
                
                {/* Cancel Button */}
                <button
                  onClick={() => setCancelProcessing(true)}
                  className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 flex items-center gap-2 transition-colors"
                  disabled={cancelProcessing}
                >
                  {cancelProcessing ? 'Cancelling...' : 'Cancel Processing'}
                </button>
              </div>
            </div>
          )}
                </label>
                
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="radio" 
                    value="force" 
                    checked={processingMode === 'force'}
                    onChange={(e) => setProcessingMode(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">Force All</span>
                    <p className="text-sm text-gray-600">Reprocess everything, even products that are already enriched</p>
                  </div>
                </label>
              </div>