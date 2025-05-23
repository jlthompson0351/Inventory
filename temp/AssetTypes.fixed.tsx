useEffect(() => {
  const loadFormsForAllAssetTypes = async () => {
    if (!currentOrganization?.id || assetTypes.length === 0) return;
    
    const formsMap: { [assetTypeId: string]: any[] } = {};
    
    // Initialize with empty arrays for each asset type
    assetTypes.forEach(assetType => {
      formsMap[assetType.id] = [];
    });
    
    // Load forms for each asset type in parallel
    await Promise.all(assetTypes.map(async (assetType) => {
      try {
        const forms = await getAssetTypeForms(assetType.id, currentOrganization.id);
        formsMap[assetType.id] = forms || [];
      } catch (e) {
        console.error(`Error fetching forms for asset type ${assetType.id}:`, e);
        formsMap[assetType.id] = [];
      }
    }));
    
    setAssetTypeForms(formsMap);
  };
  
  loadFormsForAllAssetTypes();
}, [assetTypes, currentOrganization]); 