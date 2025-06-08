// Google Shopping Debug Version - Updated 2025-05-29
import React, { useState, useCallback, useEffect, useRef } from 'react';
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

  // State variables
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
  const [csvColumns, setCsvColumns] = useState([]);
  
  // Use useRef for cancel flag to get immediate updates
  const cancelRef = useRef(false);

  // Collection Detection Function
  const detectCollection = (title, description) => {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('focus') || text.includes('clarity') || text.includes('mind') || 
        text.includes('mood') || text.includes('meditation') || text.includes('stress') ||
        text.includes('anxiety') || text.includes('calm') || text.includes('mental') ||
        text.includes('cognitive') || text.includes('brain') || text.includes('concentration')) {
      return 'Mind and Mood';
    }
    
    if (text.includes('sleep') || text.includes('rest') || text.includes('night') ||
        text.includes('bedtime') || text.includes('pillow') || text.includes('mattress') ||
        text.includes('blanket') || text.includes('relaxation') || text.includes('dream') ||
        text.includes('insomnia') || text.includes('slumber')) {
      return 'Rest and Sleep';
    }
    
    if (text.includes('movement') || text.includes('mobility') || text.includes('stretch') ||
        text.includes('exercise') || text.includes('fitness') || text.includes('yoga') ||
        text.includes('flow') || text.includes('flexibility') || text.includes('muscle') ||
        text.includes('joint') || text.includes('physical') || text.includes('active')) {
      return 'Movement and Flow';
    }
    
    if (text.includes('safety') || text.includes('support') || text.includes('confidence') ||
        text.includes('secure') || text.includes('protection') || text.includes('assist') ||
        text.includes('stability') || text.includes('balance') || text.includes('help') ||
        text.includes('aid') || text.includes('therapeutic')) {
      return 'Supportive Living';
    }
    
    return 'Everyday Comforts';
  };

  // Function to get original description from various possible columns
  const getOriginalDescription = (product) => {
    // Try different possible column names for description
    const possibleDescColumns = [
      'Body (HTML)',
      'Description',
      'Product Description', 
      'Body',
      'HTML Description',
      'Long Description'
    ];
    
    for (const col of possibleDescColumns) {
      if (product[col] && typeof product[col] === 'string' && product[col].trim()) {
        return product[col].replace(/<[^>]*>/g, '').trim();
      }
    }
    
    // If no description found, return a basic one based on title
    return `Premium ${product.Title || 'product'} for your wellness journey.`;
  };

  // Function to detect existing GTIN from CSV columns
  const getExistingGTIN = (product) => {
    // Try different possible column names for GTIN/UPC/EAN/ISBN
    const possibleGTINColumns = [
      'GTIN',
      'UPC',
      'EAN',
      'ISBN',
      'Barcode',
      'Product Code',
      'SKU',
      'Variant Barcode',
      'Variant SKU',
      'Global Trade Item Number'
    ];
    
    for (const col of possibleGTINColumns) {
      if (product[col] && product[col].toString().trim()) {
        const gtin = product[col].toString().trim();
        // Basic validation - GTINs should be 8, 12, 13, or 14 digits
        if (/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(gtin)) {
          return gtin;
        }
      }
    }
    
    return null;
  };

  // Generate helpful search queries for manual GTIN lookup
  const generateSearchSuggestions = (product) => {
    const title = product.Title || '';
    const vendor = product.Vendor || '';
    const sku = product['Variant SKU'] || product.SKU || '';
    const productType = product['Product Type'] || '';
    
    const suggestions = [];
    
    // Clean up product name for better search results
    const cleanTitle = title.replace(/[^\w\s-]/g, '').trim();
    const searchQuery = `${vendor} ${cleanTitle}`.trim();
    
    // Google Shopping (shows GTINs in product details)
    suggestions.push({
      site: 'Google Shopping',
      query: `${searchQuery}`,
      url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchQuery)}`,
      tip: 'Look for "GTIN" or "UPC" in product details'
    });
    
    // Amazon (shows ASIN and sometimes UPC)
    suggestions.push({
      site: 'Amazon',
      query: `${searchQuery}`,
      url: `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`,
      tip: 'Check product details for "UPC" or use ASIN lookup tools'
    });
    
    // Walmart (often shows UPC clearly)
    suggestions.push({
      site: 'Walmart',
      query: `${searchQuery}`,
      url: `https://www.walmart.com/search?q=${encodeURIComponent(searchQuery)}`,
      tip: 'UPC usually visible in product specifications'
    });
    
    // Target (good UPC visibility)
    suggestions.push({
      site: 'Target',
      query: `${searchQuery}`,
      url: `https://www.target.com/s?searchTerm=${encodeURIComponent(searchQuery)}`,
      tip: 'Look in "Product details" section for UPC'
    });
    
    return suggestions.slice(0, 4); // Return top 4 suggestions
  };

  // Function to search for GTIN using product information
  const searchForGTIN = async (product) => {
    // First check if GTIN already exists in the data
    const existingGTIN = getExistingGTIN(product);
    if (existingGTIN) {
      return existingGTIN;
    }

    // Try to search for GTIN using product details
    const productTitle = product.Title || '';
    const vendor = product.Vendor || '';
    const productType = product['Product Type'] || '';
    const sku = product['Variant SKU'] || product.SKU || '';
    
    console.log(`🔍 Actively searching for GTIN: ${productTitle} by ${vendor}`);
    
    // Method 1: Try UPC Database API (free tier available)
    try {
      const searchQuery = `${vendor} ${productTitle}`.trim();
      const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Thrivera-Product-Tool/1.0'
        }
      });
      
      if (upcResponse.ok) {
        const upcData = await upcResponse.json();
        if (upcData.items && upcData.items.length > 0) {
          // Look for exact or close matches
          for (const item of upcData.items) {
            const itemTitle = item.title?.toLowerCase() || '';
            const itemBrand = item.brand?.toLowerCase() || '';
            const searchTitle = productTitle.toLowerCase();
            const searchVendor = vendor.toLowerCase();
            
            // Check for good matches
            if ((itemTitle.includes(searchTitle) || searchTitle.includes(itemTitle)) &&
                (itemBrand.includes(searchVendor) || searchVendor.includes(itemBrand))) {
              console.log(`✅ Found GTIN via UPC Database: ${item.upc}`);
              return item.upc;
            }
          }
          
          // If no exact match but we have results, take the first one
          if (upcData.items.length > 0) {
            console.log(`⚠️ Using best match GTIN: ${upcData.items[0].upc}`);
            return upcData.items[0].upc;
          }
        }
      }
    } catch (error) {
      console.log('UPC Database search failed:', error.message);
    }

    // Method 2: Try Open Food Facts (for food/supplement products)
    try {
      if (productType.toLowerCase().includes('food') || 
          productType.toLowerCase().includes('supplement') ||
          productTitle.toLowerCase().includes('vitamin') ||
          productTitle.toLowerCase().includes('protein') ||
          productTitle.toLowerCase().includes('powder') ||
          productTitle.toLowerCase().includes('capsule')) {
        
        const searchQuery = `${productTitle}`.replace(/[^\w\s]/g, '').trim();
        const offResponse = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchQuery)}&search_simple=1&action=process&json=1`);
        
        if (offResponse.ok) {
          const offData = await offResponse.json();
          if (offData.products && offData.products.length > 0) {
            for (const product of offData.products) {
              const foundGTIN = product.code;
              if (foundGTIN && /^\d{8,14}$/.test(foundGTIN)) {
                console.log(`✅ Found GTIN via Open Food Facts: ${foundGTIN}`);
                return foundGTIN;
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('Open Food Facts search failed:', error.message);
    }

    // Method 3: Try Barcode Spider (free API)
    try {
      const searchQuery = `${vendor} ${productTitle}`.trim();
      const barcodeResponse = await fetch(`https://api.barcodespider.com/v1/lookup?token=free&upc=${encodeURIComponent(searchQuery)}&format=json`);
      
      if (barcodeResponse.ok) {
        const barcodeData = await barcodeResponse.json();
        if (barcodeData.item_response && barcodeData.item_response.code) {
          console.log(`✅ Found GTIN via Barcode Spider: ${barcodeData.item_response.code}`);
          return barcodeData.item_response.code;
        }
      }
    } catch (error) {
      console.log('Barcode Spider search failed:', error.message);
    }

    // Method 4: Try to extract from product model/SKU patterns
    try {
      const skuPattern = sku || '';
      const titleWords = productTitle.split(/\s+/);
      
      // Look for numeric patterns that could be GTINs
      const potentialGTINs = [];
      
      // Check SKU for GTIN-like patterns
      if (/^\d{8,14}$/.test(skuPattern)) {
        potentialGTINs.push(skuPattern);
      }
      
      // Check product title for numbers
      titleWords.forEach(word => {
        if (/^\d{8,14}$/.test(word)) {
          potentialGTINs.push(word);
        }
      });
      
      // If we found potential GTINs, validate them
      for (const gtin of potentialGTINs) {
        if (validateGTIN(gtin)) {
          console.log(`✅ Found GTIN in product data: ${gtin}`);
          return gtin;
        }
      }
    } catch (error) {
      console.log('Pattern extraction failed:', error.message);
    }

    // Method 5: Try alternative free APIs
    try {
      // Search multiple terms
      const searchTerms = [
        `${vendor} ${productTitle}`,
        productTitle,
        `${vendor} ${productType}`,
        sku
      ].filter(term => term && term.trim());

      for (const term of searchTerms) {
        try {
          // Try a different approach with fetch to a proxy service
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent('https://www.google.com/search?tbm=shop&q=' + encodeURIComponent(term + ' UPC'))}`;
          const response = await fetch(proxyUrl);
          
          if (response.ok) {
            const data = await response.json();
            const htmlContent = data.contents;
            
            // Look for GTIN patterns in the HTML
            const gtinMatches = htmlContent.match(/(?:UPC|GTIN|EAN)[\s:]*(\d{8,14})/gi);
            if (gtinMatches && gtinMatches.length > 0) {
              const foundGTIN = gtinMatches[0].match(/\d{8,14}/)[0];
              if (validateGTIN(foundGTIN)) {
                console.log(`✅ Found GTIN via Google Shopping scrape: ${foundGTIN}`);
                return foundGTIN;
              }
            }
          }
        } catch (proxyError) {
          console.log('Proxy search failed for term:', term);
        }
      }
    } catch (error) {
      console.log('Alternative search methods failed:', error.message);
    }

    // Method 6: Generate search suggestions for manual lookup as fallback
    const searchSuggestions = generateSearchSuggestions(product);
    
    return {
      status: 'LOOKUP_NEEDED',
      searchSuggestions: searchSuggestions,
      message: `Auto-search unsuccessful - manual lookup needed`
    };
  };

  // GTIN validation function
  const validateGTIN = (gtin) => {
    if (!gtin || typeof gtin !== 'string') return false;
    
    // Must be 8, 12, 13, or 14 digits
    if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(gtin)) return false;
    
    // Basic checksum validation for UPC/EAN
    const digits = gtin.split('').map(Number);
    let sum = 0;
    
    if (gtin.length === 13) { // EAN-13
      for (let i = 0; i < 12; i++) {
        sum += digits[i] * (i % 2 === 0 ? 1 : 3);
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      return checkDigit === digits[12];
    }
    
    if (gtin.length === 12) { // UPC-A
      for (let i = 0; i < 11; i++) {
        sum += digits[i] * (i % 2 === 0 ? 3 : 1);
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      return checkDigit === digits[11];
    }
    
    // For 8 and 14 digit codes, just return true for now
    return true;
  };

  // OpenAI API function with better variety
  const generateAIDescription = async (product, collection, originalDesc) => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Get product specifications to preserve
    const productTitle = product.Title || '';
    const productType = product['Product Type'] || '';
    const vendor = product.Vendor || '';

    // Create different prompt approaches for REAL variety
    const promptVariations = [
      // Approach 1: Benefits-focused
      `Write a wellness-focused product description for ${productTitle}. 

Original description: ${originalDesc}
Collection: ${collection}

Start with a compelling benefit statement (not "Discover" or "Experience"). Focus on how this specific product enhances daily wellness. Keep all product details like size, color, material, scent, etc. Write 2-3 paragraphs ending with "Experience the Thrivera difference." Be conversational and specific.`,

      // Approach 2: Lifestyle-focused  
      `Transform this product description into Thrivera's wellness voice for ${productTitle}.

Original: ${originalDesc}
Collection: ${collection}

Begin with how this fits into a wellness lifestyle (avoid "Welcome" or "Embrace"). Highlight specific features and benefits. Maintain all technical details. Write naturally as if recommending to a friend. End with "Experience the Thrivera difference."`,

      // Approach 3: Problem-solution focused
      `Create a Thrivera description for ${productTitle} that addresses wellness needs.

Original: ${originalDesc}  
Collection: ${collection}

Start by identifying what wellness challenge this solves (don't use "Find" or generic openings). Explain the solution this product provides. Keep all specifications intact. Write 150-200 words ending with "Experience the Thrivera difference."`,

      // Approach 4: Sensory-focused
      `Write an engaging product description for ${productTitle} emphasizing the sensory wellness experience.

Original: ${originalDesc}
Collection: ${collection}

Begin with the sensory experience or feeling this product creates. Describe textures, comfort, or atmosphere. Preserve all product specifications. Make it feel premium and thoughtful. End with "Experience the Thrivera difference."`,

      // Approach 5: Community-focused
      `Create a Thrivera description for ${productTitle} that feels personal and supportive.

Original: ${originalDesc}
Collection: ${collection}

Start with an empathetic understanding of the customer's wellness journey. Show how this product supports their goals. Keep all technical details. Write warmly and inclusively. Conclude with "Experience the Thrivera difference."`
    ];

    // Randomly select approach
    const selectedPrompt = promptVariations[Math.floor(Math.random() * promptVariations.length)];
    
    console.log('AI Prompt approach:', Math.floor(Math.random() * promptVariations.length) + 1, 'for:', product.Title);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: selectedPrompt }],
          max_tokens: 250,
          temperature: 0.9, // Higher for more creativity
          presence_penalty: 0.6, // Encourage unique content
          frequency_penalty: 0.4 // Reduce repetitive phrases
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
      
    } catch (error) {
      console.error('OpenAI API Call Failed:', error);
      throw error;
    }
  };

  // Generate Thrivera Description
  const generateThriveraDescription = async (product, collection) => {
    const originalDesc = getOriginalDescription(product);
    
    try {
      const aiDescription = await generateAIDescription(product, collection, originalDesc);
      return aiDescription;
    } catch (error) {
      console.error('OpenAI generation failed, using fallback:', error);
      const productName = product.Title?.toLowerCase() || 'wellness essential';
      return `Transform your daily routine with this thoughtfully designed ${productName}. Carefully selected for the ${collection} collection to support your wellness journey. Experience the Thrivera difference.`;
    }
  };

  // Generate SEO Content
  const generateSEO = (product, collection) => {
    const productName = product.Title?.trim() || product.Handle || 'Wellness Product';
    const seoTitle = `${productName} - Wellness Collection | Thrivera`;
    
    const originalDesc = getOriginalDescription(product);
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
  const generateGoogleShopping = (product, collection, gtin = null) => {
    const title = (product.Title || '').toLowerCase();
    const price = parseFloat(product['Variant Price']) || 0;
    const vendor = product.Vendor || '';
    
    let gender = 'unisex';
    if (title.includes('men') && !title.includes('women')) {
      gender = 'male';
    } else if (title.includes('women') && !title.includes('men')) {
      gender = 'female';
    }
    
    let priceRange = 'budget';
    if (price > 50) priceRange = 'premium';
    else if (price > 25) priceRange = 'mid-range';
    
    const shoppingData = googleShoppingData[collection] || googleShoppingData["Everyday Comforts"];
    
    // Note: Google Shopping settings are typically managed through Shopify's Google Shopping app
    // The app automatically pulls GTIN from Variant Barcode field
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

  // Handle cancel processing - FIXED with useRef
  const handleCancelProcessing = () => {
    console.log('CANCEL BUTTON CLICKED - Setting cancel flag');
    cancelRef.current = true;
    setUploadError('Cancelling processing...');
  };

  // Process all products automatically - FIXED cancel logic
  const processAllProducts = useCallback(async () => {
    if (products.length === 0) return;
    
    console.log('Starting processing...');
    setProcessing(true);
    setUploadError('');
    cancelRef.current = false; // Reset cancel flag
    
    let productsToProcess = [];
    if (processingMode === 'smart') {
      productsToProcess = products.filter(product => !isAlreadyEnriched(product));
      console.log(`Smart mode: Processing ${productsToProcess.length} of ${products.length} products`);
    } else {
      productsToProcess = products;
      console.log(`Force mode: Processing all ${products.length} products`);
    }
    
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
      const processedProducts = [...products];
      
      for (let i = 0; i < productsToProcess.length; i++) {
        // Check cancel flag at start of each iteration
        if (cancelRef.current) {
          console.log('Processing cancelled by user at product', i + 1);
          setUploadError('Processing was cancelled by user.');
          break;
        }
        
        const product = productsToProcess[i];
        
        setProcessingStats(prev => ({
          ...prev,
          current: i + 1,
          currentProduct: product.Title || `Product ${i + 1}`
        }));
        
        try {
          console.log(`Processing product ${i + 1}/${productsToProcess.length}:`, product.Title);
          
          const detectedCollection = detectCollection(product.Title, getOriginalDescription(product));
          const newDescription = await generateThriveraDescription(product, detectedCollection);
          const seoContent = generateSEO(product, detectedCollection);
          
          // Look for GTIN with enhanced search
          const gtinResult = await searchForGTIN(product);
          let gtin = null;
          let gtinStatus = 'Not found';
          let searchSuggestions = [];
          
          if (typeof gtinResult === 'string') {
            if (gtinResult === 'LOOKUP_NEEDED') {
              gtinStatus = 'Manual lookup required';
            } else {
              gtin = gtinResult;
              gtinStatus = 'Found';
            }
          } else if (typeof gtinResult === 'object' && gtinResult.status) {
            gtinStatus = gtinResult.message || 'Manual lookup required';
            searchSuggestions = gtinResult.searchSuggestions || [];
          }
          
          const googleShopping = generateGoogleShopping(product, detectedCollection, gtin);
          const newTags = collectionTags[detectedCollection].tags.join(', ');
          
          const result = {
            ...product,
            enriched: true,
            enrichedAt: new Date().toISOString(),
            detectedCollection,
            originalDescription: getOriginalDescription(product),
            originalTags: product.Tags || '',
            originalSeoTitle: product['SEO Title'] || '',
            originalSeoDescription: product['SEO Description'] || '',
            foundGTIN: gtin,
            gtinStatus: gtinStatus,
            gtinSearchSuggestions: searchSuggestions,
            newDescription,
            newTags,
            newSeoTitle: seoContent.title,
            newSeoDescription: seoContent.description,
            ...googleShopping
          };
          
          const productIndex = processedProducts.findIndex(p => p.id === product.id);
          if (productIndex !== -1) {
            processedProducts[productIndex] = result;
          }
          
          setProducts([...processedProducts]);
          
          // Check cancel flag before delay
          if (cancelRef.current) {
            console.log('Cancel detected, breaking loop');
            break;
          }
          
          if (i < productsToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          console.error('Error processing product:', product.Title, error);
          // Continue with next product even if one fails
        }
      }
      
      setProducts(processedProducts);
      console.log('Processing completed');
      
    } catch (error) {
      console.error('Processing error:', error);
      setUploadError('Error processing products: ' + error.message);
    } finally {
      setProcessing(false);
      cancelRef.current = false;
      setProcessingStats({ total: 0, current: 0, currentProduct: '', toProcess: 0, alreadyEnriched: 0 });
    }
  }, [products, processingMode]);

  // Handle file upload with column detection
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

        // Debug: Log available columns
        if (results.data[0]) {
          const columns = Object.keys(results.data[0]);
          console.log('Available CSV columns:', columns);
          setCsvColumns(columns);
          
          // Check for description columns
          const descColumns = columns.filter(col => 
            col.toLowerCase().includes('description') || 
            col.toLowerCase().includes('body') ||
            col.toLowerCase().includes('html')
          );
          console.log('Found description columns:', descColumns);
          
          // Check for GTIN/UPC/Barcode columns
          const gtinColumns = columns.filter(col => 
            col.toLowerCase().includes('gtin') || 
            col.toLowerCase().includes('upc') ||
            col.toLowerCase().includes('ean') ||
            col.toLowerCase().includes('barcode') ||
            col.toLowerCase().includes('isbn') ||
            col.toLowerCase().includes('sku')
          );
          console.log('Found GTIN/barcode columns:', gtinColumns);
        }

        const titleMap = new Map();
        
        results.data.forEach((product) => {
          if (product.Handle && product.Title?.trim()) {
            titleMap.set(product.Handle, product.Title.trim());
          }
        });
        
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

  // Download function
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

  // Export functions
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
        delete cleanProduct.foundGTIN;
        delete cleanProduct.gtinStatus;
        delete cleanProduct.gtinSearchSuggestions;
        delete cleanProduct.id;
        
        // Note: Google Shopping settings are configured in Shopify's Google Shopping app
        // They are not imported via CSV - the app pulls data from standard product fields
        
        if (product.enriched) {
          cleanProduct['Body (HTML)'] = product.newDescription || product.originalDescription;
          cleanProduct['Tags'] = product.newTags || product.originalTags;
          cleanProduct['SEO Title'] = product.newSeoTitle || product.originalSeoTitle;
          cleanProduct['SEO Description'] = product.newSeoDescription || product.originalSeoDescription;
          
          // Add GTIN to Shopify's standard barcode field ONLY
          // Shopify doesn't accept arbitrary Google Shopping columns in product import
          if (product.foundGTIN && product.foundGTIN !== 'LOOKUP_NEEDED') {
            cleanProduct['Variant Barcode'] = product.foundGTIN; // Standard Shopify barcode field
          }
          
          // Note: Google Shopping GTIN is handled by Shopify's Google Shopping app automatically
          // It pulls from the Variant Barcode field, so no separate column needed
        }
        
        if (includeTracking) {
          cleanProduct['Enrichment Status'] = product.enriched ? 'Enriched' : 'Pending';
          cleanProduct['Detected Collection'] = product.detectedCollection || '';
          cleanProduct['Enriched Date'] = product.enrichedAt || '';
          cleanProduct['GTIN Status'] = product.gtinStatus || '';
          cleanProduct['Found GTIN'] = product.foundGTIN || '';
          cleanProduct['GTIN Search Sites'] = product.gtinSearchSuggestions ? 
            product.gtinSearchSuggestions.map(s => s.site).join(' | ') : '';
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
      
      downloadFile(csv, filename);
      
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                🌿 Thrivera Product Enrichment (Debug)
              </h1>
              <p className="text-gray-600">
                Automatically transform vendor product descriptions into consistent Thrivera wellness voice, assign collection tags, search for GTINs, and optimize for Google Shopping.
              </p>

              {csvColumns.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg mt-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">CSV Columns Detected:</h4>
                  <p className="text-xs text-blue-700">{csvColumns.join(', ')}</p>
                </div>
              )}

              <div className="bg-yellow-50 p-3 rounded-lg mt-3">
                <h4 className="text-sm font-medium text-yellow-900 mb-1">🛒 GTIN Lookup via Shopping Sites:</h4>
                <p className="text-xs text-yellow-700 mb-2">
                  The tool automatically generates search links for major shopping sites where GTINs are commonly displayed. 
                  This is often faster and more reliable than APIs!
                </p>
                <div className="text-xs text-yellow-800 bg-yellow-100 p-2 rounded">
                  <strong>Smart Shopping Site Search:</strong>
                  <br />• <strong>Google Shopping</strong> - Shows GTINs in product details
                  <br />• <strong>Amazon, Walmart, Target</strong> - UPC visible in specifications  
                  <br />• <strong>Manufacturer Sites</strong> - Official product pages with codes
                  <br />• <strong>UPC Databases</strong> - Dedicated barcode lookup sites
                  <br /><em>💡 Click the provided links to search each site automatically!</em>
                </div>
              </div>

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
            </div>
            {totalCount > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all products? This cannot be undone.')) {
                    setProducts([]);
                    setFilteredProducts([]);
                  }
                }}
                className="text-red-600 hover:text-red-800 flex items-center gap-2 text-sm"
                title="Clear all products"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            )}
          </div>
        </div>

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
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors">
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
                
                <div className="flex items-center gap-2 text-green-600">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>
                    {processingStats.total > 0 ? Math.round((processingStats.current / processingStats.total) * 100) : 0}% complete 
                    ({processingStats.current} of {processingStats.total} products)
                  </span>
                </div>
                
                <button
                  onClick={handleCancelProcessing}
                  className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 flex items-center gap-2 transition-colors text-lg font-semibold"
                  style={{ minWidth: '200px' }}
                >
                  🛑 CANCEL PROCESSING
                </button>
              </div>
            </div>
          )}
        </div>

        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🏷️ Thrivera Collections & Google Shopping</h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-green-900 mb-2">🛒 Smart GTIN Discovery</h3>
              <div className="text-sm text-green-800 space-y-1">
                <div><strong>Shopping Site Lookup (Recommended):</strong></div>
                <div>• <strong>Google Shopping</strong> → Direct links to product searches with visible GTINs</div>
                <div>• <strong>Major Retailers</strong> → Amazon, Walmart, Target show UPCs in details</div>
                <div>• <strong>Manufacturer Sites</strong> → Official pages often have product codes</div>
                <div className="text-xs text-green-700 mt-2">
                  💡 <strong>Why this works:</strong> Most retailers display UPC/GTIN in product specs - no API needed!
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(collectionTags).map(([collection, data]) => (
                <div key={collection} className="bg-green-50 border border-green-200 rounded-lg p-4">
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

        {enrichedCount > 0 && (
          <React.Fragment>
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
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Products</option>
                    <option value="enriched">Processed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportEnrichedData(false)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 transition-colors"
                    title="Exports with found GTINs in 'Variant Barcode' column + search suggestions for missing ones"
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
                             <div>
                               <h4 className="text-sm font-medium text-gray-700 mb-2">Original Description</h4>
                               <div className="bg-gray-50 border rounded-md p-3 text-sm text-gray-600 max-h-32 overflow-y-auto">
                                 {product.originalDescription || 'No description found'}
                               </div>
                             </div>
                             
                             <div>
                               <h4 className="text-sm font-medium text-green-700 mb-2">Thrivera Description</h4>
                               <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800 max-h-32 overflow-y-auto">
                                 {product.newDescription}
                               </div>
                             </div>
                             
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

                             <div className="lg:col-span-2">
                               <h4 className="text-sm font-medium text-blue-700 mb-2">Shopify Data & GTIN</h4>
                               <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800 space-y-1">
                                 <div><strong>Detected Collection:</strong> {product.detectedCollection}</div>
                                 <div><strong>GTIN/Barcode:</strong> {product.foundGTIN || 'Not found'} 
                                   {product.gtinStatus && (
                                     <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                       product.gtinStatus === 'Found' ? 'bg-green-100 text-green-800' :
                                       product.gtinStatus.includes('Manual lookup') ? 'bg-yellow-100 text-yellow-800' :
                                       'bg-gray-100 text-gray-800'
                                     }`}>
                                       {product.gtinStatus.includes('Found') ? 'Found' : 
                                        product.gtinStatus.includes('Manual') ? 'Manual lookup needed' : 
                                        product.gtinStatus}
                                     </span>
                                   )}
                                 </div>
                                 {product.gtinSearchSuggestions && product.gtinSearchSuggestions.length > 0 && (
                                   <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                                     <div className="text-yellow-800 font-medium mb-2">🛒 Shopping Site Lookup:</div>
                                     <div className="space-y-1">
                                       {product.gtinSearchSuggestions.map((suggestion, idx) => (
                                         <div key={idx} className="flex items-start gap-2">
                                           <div className="text-yellow-700 text-xs flex-1">
                                             <a 
                                               href={suggestion.url}
                                               target="_blank"
                                               rel="noopener noreferrer"
                                               className="font-medium underline hover:text-yellow-900 block"
                                             >
                                               🔗 Search {suggestion.site}
                                             </a>
                                             <div className="text-xs text-yellow-600 mt-1 italic">
                                               {suggestion.tip}
                                             </div>
                                           </div>
                                         </div>
                                       ))}
                                       <div className="text-xs text-yellow-600 mt-2 p-2 bg-yellow-100 rounded">
                                         💡 <strong>How to find GTIN:</strong> Look for "UPC", "GTIN", "EAN", or "Barcode" in product details on these sites
                                       </div>
                                     </div>
                                   </div>
                                 )}
                                 <div className="text-xs text-blue-600 mt-2">
                                   → Goes to <strong>Variant Barcode</strong> in Shopify CSV
                                 </div>
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
         </React.Fragment>
       )}

       <div className="mt-8 text-center text-sm text-gray-500">
         <p>Thrivera Product Enrichment Tool - Debug Version 🌿</p>
       </div>
     </div>
   </div>
  );
};

export default App;