// Google Shopping Debug Version - Updated 2025-05-29
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Download, Check, Search, RefreshCw, Wand2, AlertCircle, Trash2 } from 'lucide-react';
import Papa from 'papaparse';

const App = () => {
  // Thrivera Collection Knowledge Base
  const collectionTags = {
    "Mind and Mood": {
      tags: ["mind", "mood", "focus", "aromatherapy"],
      keywords: ["essential oil", "aromatherapy", "diffuser", "scent", "fragrance", "focus", "concentration", "mental", "clarity", "meditation", "mindfulness", "stress", "anxiety", "mood", "emotional", "calm mind", "mental wellness"]
    },
    "Movement and Flow": {
      tags: ["movement", "mobility", "stretch", "flow"],
      keywords: ["yoga", "exercise", "fitness", "stretch", "mobility", "movement", "flow", "muscle", "joint", "flexibility", "workout", "active", "physical", "body", "posture", "balance", "strength"]
    },
    "Rest and Sleep": {
      tags: ["rest", "sleep", "night", "calm"],
      keywords: ["sleep", "night", "bedtime", "pillow", "mattress", "blanket", "rest", "relaxation", "calm", "peaceful", "soothing", "nighttime", "evening", "slumber", "tranquil", "serene"]
    },
    "Supportive Living": {
      tags: ["safety", "support", "confidence", "home"],
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

  // Automatic Collection Detection
  const detectCollection = (product) => {
    const title = (product.Title || '').toLowerCase();
    const description = (product['Body (HTML)'] || '').toLowerCase().replace(/<[^>]*>/g, '');
    const vendor = (product.Vendor || '').toLowerCase();
    const productType = (product.Type || '').toLowerCase();
    const tags = (product.Tags || '').toLowerCase();
    const searchText = `${title} ${description} ${vendor} ${productType} ${tags}`;

    let bestMatch = null;
    let highestScore = 0;

    Object.entries(collectionTags).forEach(([collection, data]) => {
      let score = 0;
      data.keywords.forEach(keyword => {
        if (searchText.includes(keyword.toLowerCase())) {
          score += keyword.length;
        }
      });
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = collection;
      }
    });

    return bestMatch || "Everyday Comforts";
  };

  // Generate Thrivera Description - retaining all vendor details
  const generateThriveraDescription = (product, collection) => {
    const productName = product.Title?.trim() || product.Handle || 'this wellness essential';
    const originalDesc = (product['Body (HTML)'] || '').replace(/<[^>]*>/g, '').trim();
    
    if (!originalDesc) {
      return `Experience wellness with our thoughtfully curated ${productName.toLowerCase()}. Designed with your well-being in mind. Embrace wellness, naturally.`;
    }
    
    const descriptive = thriveraVoice.descriptiveWords[Math.floor(Math.random() * thriveraVoice.descriptiveWords.length)];
    const benefit = thriveraVoice.benefits[Math.floor(Math.random() * thriveraVoice.benefits.length)];
    const closing = thriveraVoice.closings[Math.floor(Math.random() * thriveraVoice.closings.length)];

    let description = '';

    // Collection-specific wellness-focused intros
    if (collection === 'Mind and Mood') {
      description = `Nurture your mind and elevate your mood with this ${descriptive} wellness essential. `;
    } else if (collection === 'Movement and Flow') {
      description = `Support your active lifestyle with this ${descriptive} movement companion. `;
    } else if (collection === 'Rest and Sleep') {
      description = `Create your sanctuary of rest with this ${descriptive} sleep essential. `;
    } else if (collection === 'Supportive Living') {
      description = `Enhance your daily confidence with this ${descriptive} supportive solution. `;
    } else {
      description = `Embrace everyday comfort with this ${descriptive} wellness essential. `;
    }

    // Transform vendor description into Thrivera voice while keeping all details
    let enhancedDesc = originalDesc
      .replace(/\b(great|good|nice|excellent)\b/gi, 'thoughtfully designed')
      .replace(/\b(perfect|ideal)\b/gi, 'beautifully suited')
      .replace(/\b(high-quality|premium|top-quality)\b/gi, 'mindfully crafted')
      .replace(/\b(comfortable|comfy)\b/gi, 'gently supportive')
      .replace(/\b(durable|long-lasting)\b/gi, 'lovingly made to last')
      .replace(/\b(easy to use|simple)\b/gi, 'effortlessly integrated into your wellness routine')
      .replace(/\b(affordable|budget-friendly)\b/gi, 'accessible wellness')
      .replace(/\b(effective|powerful)\b/gi, 'naturally effective')
      .replace(/\b(recommended|suggested)\b/gi, 'lovingly selected')
      .replace(/\b(helps|assists)\b/gi, 'gently supports')
      .replace(/\b(provides|offers|gives)\b/gi, 'nurtures you with');

    description += enhancedDesc;
    
    if (!description.trim().endsWith('.') && !description.trim().endsWith('!')) {
      description += '. ';
    } else {
      description += ' ';
    }
    
    description += `This ${benefit}. ${closing}`;

    return description;
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
    
    const processedProducts = products.map((product, index) => {
      try {
        console.log(`Processing product ${index + 1}:`, product.Title);
        
        const detectedCollection = detectCollection(product);
        console.log('Detected collection:', detectedCollection);
        
        const newDescription = generateThriveraDescription(product, detectedCollection);
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
          // Add Google Shopping data
          ...googleShopping
        };
        
        console.log('Final product result for', product.Title, ':', result);
        return result;
        
      } catch (error) {
        console.error('Error processing product:', product.Title, error);
        return product; // Return original product if processing fails
      }
    });
    
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
   </div>
 );
};

export default App;