import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Navbar from "../Navbar";
import "./ItemDetail.css";
import { createChatRoomFromItem, getItemDetails, recordItemView, addToWishlist, removeFromWishlist, isItemInWishlist, updateItem, deleteItem, deleteItemImage } from "../../lib/api";

function ItemDetail() {
  const { id } = useParams(); // Get item ID from URL
  const [item, setItem] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [contacting, setContacting] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const navigate = useNavigate(); // For page navigation

  useEffect(() => {
    async function fetchItemAndSimilar() {
      try {
        setLoading(true);
        setErrorMsg("");

        // Get item basic information
        const itemRes = await getItemDetails(id);
        if (itemRes.res_code !== 200 || !itemRes.item) {
          throw new Error(itemRes.res_msg || "Failed to load item");
        }

        const baseItem = itemRes.item;

        const { data: tagData, error: tagError } = await supabase
          .from("item_tags")
          .select("tag")
          .eq("item_id", id);
        if (tagError) throw tagError;

        const tagsList = tagData?.map((row) => row.tag) || [];

        setItem({
          ...baseItem,
          image_url: baseItem.image_url || baseItem.images?.[0]?.url || null,
          images: baseItem.images || [],
          tags: baseItem.tags || tagsList,
          seller_id: baseItem.seller_id || baseItem.seller?.id || null,
          seller_display_name:
            baseItem.seller_display_name ||
            baseItem.seller?.display_name ||
            null,
          seller_trust_score:
            baseItem.seller_trust_score ??
            baseItem.seller?.trust_score ??
            null,
        });
        
        // Reset selected image index when item changes
        setSelectedImageIndex(0);

        // Record recently viewed items in localStorage
        try {
          const viewed = {
            id: baseItem.id,
            title: baseItem.title,
            price: baseItem.price ?? null,
            image: baseItem.image_url || baseItem.images?.[0]?.url || null
          };
          const key = 'recent_items';
          const raw = localStorage.getItem(key);
          const list = Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw || '[]') : [];
          // Remove duplicates: remove same id then add to front
          const filtered = list.filter((x) => x && x.id !== viewed.id);
          const next = [viewed, ...filtered].slice(0, 12); // Keep maximum 12 items
          localStorage.setItem(key, JSON.stringify(next));
        } catch (e) {
          // ignore localStorage errors
          console.warn('failed to update recent_items', e);
        }

        // Record on server if logged in user (can be ignored)
        try {
          await recordItemView(baseItem.id);
        } catch (e) {
          // ignore server errors for UX
          console.warn('failed to record item view on server', e);
        }

        // Similar items recommendation (RPC call)
        const { data: simData, error: simErr } = await supabase.rpc(
          "search_similar_to_item_by_id",
          { self_id: id, k: 6 }
        );
        if (simErr) throw simErr;
        setSimilar(simData || []);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message || "Error loading item details");
      } finally {
        setLoading(false);
      }
    }

    fetchItemAndSimilar();
  }, [id]);

  // Listen for rating updates separately to avoid dependency issues
  useEffect(() => {
    const handleRatingUpdate = (event) => {
      // Only refresh if the updated user is the seller of this item
      if (item?.seller_id && event.detail?.revieweeId === item.seller_id) {
        // Re-fetch item details to get updated seller trust_score
        const refreshItem = async () => {
          try {
            const itemRes = await getItemDetails(id);
            if (itemRes.res_code === 200 && itemRes.item) {
              const baseItem = itemRes.item;
              const { data: tagData } = await supabase
                .from("item_tags")
                .select("tag")
                .eq("item_id", id);
              const tagsList = tagData?.map((row) => row.tag) || [];
              
              setItem({
                ...baseItem,
                image_url: baseItem.image_url || baseItem.images?.[0]?.url || null,
                images: baseItem.images || [],
                tags: baseItem.tags || tagsList,
                seller_id: baseItem.seller_id || baseItem.seller?.id || null,
                seller_display_name:
                  baseItem.seller_display_name ||
                  baseItem.seller?.display_name ||
                  null,
                seller_trust_score:
                  baseItem.seller_trust_score ??
                  baseItem.seller?.trust_score ??
                  null,
              });
            }
          } catch (err) {
            console.error('[ItemDetail] Error refreshing item after rating update:', err);
          }
        };
        refreshItem();
      }
    };
    window.addEventListener('ratingUpdated', handleRatingUpdate);

    return () => {
      window.removeEventListener('ratingUpdated', handleRatingUpdate);
    };
  }, [id, item?.seller_id]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user) {
          const userId = data.user.id;
          setCurrentUserId(userId);
          // Check if user is admin
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();
          
          if (profileError) {
            console.error('[ItemDetail] Failed to load user profile', profileError);
            setIsAdmin(false);
          } else {
            const adminStatus = !!userProfile?.is_admin;
            console.log('[ItemDetail] Admin check:', { userId, isAdmin: adminStatus, userProfile });
            setIsAdmin(adminStatus);
          }
        } else {
          setCurrentUserId(null);
          setIsAdmin(false);
        }
      } catch (e) {
        console.error('[ItemDetail] Failed to load current user', e);
        setCurrentUserId(null);
        setIsAdmin(false);
      }
    };
    loadCurrentUser();
  }, []);

  // Check initial favorite state when item and user are known
  useEffect(() => {
    const checkFav = async () => {
      try {
        if (!item?.id || !currentUserId) {
          setIsFavorite(false);
          return;
        }
        const res = await isItemInWishlist(item.id);
        if (res?.res_code === 200) {
          setIsFavorite(!!res.in_wishlist);
        }
      } catch (_) {
        setIsFavorite(false);
      }
    };
    checkFav();
  }, [item?.id, currentUserId]);

  if (loading) return <p className="loading">Loading...</p>;
  if (errorMsg) return <p className="error">{errorMsg}</p>;
  if (!item) return <p>Item not found.</p>;

  async function handleToggleFavorite(e) {
    e?.preventDefault?.();
    if (!item?.id) return;
    if (!currentUserId) {
      alert("Please sign in to use favorites.");
      return;
    }
    if (favLoading) return;

    setFavLoading(true);
    const prev = isFavorite;
    // Optimistic toggle
    setIsFavorite(!prev);
    try {
      if (!prev) {
        const res = await addToWishlist(item.id);
        if (res.res_code !== 201 && res.res_code !== 200 && res.res_code !== 409) {
          throw new Error(res.res_msg || "Failed to add to favorites");
        }
      } else {
        const res = await removeFromWishlist(item.id);
        if (res.res_code !== 200) {
          throw new Error(res.res_msg || "Failed to remove from favorites");
        }
      }
    } catch (err) {
      console.error("Favorite toggle failed:", err);
      // Revert on error
      setIsFavorite(prev);
      alert(err.message || "Failed to update favorite");
    } finally {
      setFavLoading(false);
    }
  }

  const handleContactSeller = async () => {
    if (!item || contacting) return;
    setContacting(true);
    try {
      const response = await createChatRoomFromItem(item.id);
      if (response.res_code === 201 || response.res_code === 200 || response.res_code === 409) {
        const roomId = response.chat_room?.id;
        if (roomId) {
          navigate("/chat", { state: { chatRoomId: roomId } });
        } else {
          navigate("/chat");
        }
      } else if (response.res_code === 401) {
        alert("Please sign in to contact the seller.");
      } else {
        alert(response.res_msg || "Failed to start chat.");
      }
    } catch (error) {
      console.error("Failed to create chat room:", error);
      alert(error.message || "Failed to start chat.");
    } finally {
      setContacting(false);
    }
  };

  const startEditing = () => {
    if (!item) return;
    setEditTitle(item.title || '');
    setEditDescription(item.description || '');
    setEditPrice(item.price ? String(item.price) : '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (!item) return;
    setEditTitle(item.title || '');
    setEditDescription(item.description || '');
    setEditPrice(item.price ? String(item.price) : '');
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!item || savingEdit) return;
    const trimmedTitle = editTitle.trim();
    const trimmedDescription = editDescription.trim();
    const priceStr = editPrice.trim();
    const priceNum = priceStr ? parseFloat(priceStr) : null;
    
    if (!trimmedTitle) {
      alert('Title is required.');
      return;
    }
    
    if (priceStr && (isNaN(priceNum) || priceNum < 0)) {
      alert('Please enter a valid price (0 or greater).');
      return;
    }
    
    setSavingEdit(true);
    try {
      const updateData = {
        title: trimmedTitle,
        description: trimmedDescription
      };
      
      // Only include price if it's provided
      if (priceStr) {
        updateData.price = priceNum;
      } else {
        updateData.price = null;
      }
      
      const res = await updateItem(item.id, updateData);
      if (res.res_code === 200 && res.item) {
        // Reload item data from server to ensure consistency
        const itemRes = await getItemDetails(item.id);
        if (itemRes.res_code === 200 && itemRes.item) {
          const baseItem = itemRes.item;
          
          // Get tags
          const { data: tagData } = await supabase
            .from("item_tags")
            .select("tag")
            .eq("item_id", item.id);
          const tagsList = tagData?.map((row) => row.tag) || [];
          
          setItem({
            ...baseItem,
            image_url: baseItem.image_url || baseItem.images?.[0]?.url || null,
            images: baseItem.images || [],
            tags: baseItem.tags || tagsList,
            seller_id: baseItem.seller_id || baseItem.seller?.id || null,
            seller_display_name:
              baseItem.seller_display_name ||
              baseItem.seller?.display_name ||
              null,
            seller_trust_score:
              baseItem.seller_trust_score ??
              baseItem.seller?.trust_score ??
              null,
          });
        } else {
          // Fallback: update local state if reload fails
          setItem((prev) => prev ? { 
            ...prev, 
            title: res.item.title, 
            description: res.item.description,
            price: res.item.price
          } : prev);
        }
        setIsEditing(false);
      } else {
        alert(res.res_msg || 'Failed to update item');
      }
    } catch (e) {
      alert(e.message || 'Failed to update item');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    const confirmed = window.confirm('Delete this item? This action cannot be undone.');
    if (!confirmed) return;
    try {
      const res = await deleteItem(item.id);
      if (res.res_code === 200) {
        alert('Item deleted.');
        navigate('/item', { replace: true });
      } else {
        alert(res.res_msg || 'Failed to delete item');
      }
    } catch (e) {
      alert(e.message || 'Failed to delete item');
    }
  };

  // Helper function to convert jfif to jpeg
  const toJpegBlob = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(resolve, "image/jpeg", 0.9);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Helper function to make safe file name
  const makeSafeFileName = (name) => {
    return name.replace(/[^a-zA-Z0-9.-]/g, "_");
  };

  // Upload image to Supabase Storage
  const uploadAndGetPublicUrl = async (file) => {
    const userId = currentUserId || "guest";
    const safeName = makeSafeFileName(file.name);
    const path = `user-${userId}/${Date.now()}-${safeName}`;

    const ext = file.name.split(".").pop()?.toLowerCase();
    let contentType = file.type || "application/octet-stream";
    if (ext === "jfif" || contentType === "" || contentType === "image/pjpeg") {
      contentType = "image/jpeg";
    }

    const { data, error } = await supabase.storage
      .from("items")
      .upload(path, file, { upsert: true, contentType });

    if (error) {
      console.error("[upload error]", error);
      throw new Error(error.message || "Upload failed");
    }

    const { data: pub } = supabase.storage.from("items").getPublicUrl(data.path);
    console.log("[upload ok]", pub?.publicUrl);
    return pub?.publicUrl;
  };

  // Handle image file selection and upload
  const handleAddImage = async (e) => {
    if (!item || !isEditing || uploadingImage) return;
    
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Check max images (10 total)
    const currentImageCount = item.images?.length || 0;
    if (currentImageCount + files.length > 10) {
      alert("You can only have up to 10 images total.");
      e.target.value = "";
      return;
    }

    setUploadingImage(true);
    try {
      const uploadedUrls = [];
      
      for (let file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "jfif" || file.type === "" || file.type === "image/pjpeg") {
          file = await toJpegBlob(file);
        }
        const url = await uploadAndGetPublicUrl(file);
        uploadedUrls.push(url);
      }

      // Insert images into item_images table
      const imageData = uploadedUrls.map((url, index) => ({
        item_id: item.id,
        url: url,
        sort_order: (item.images?.length || 0) + index
      }));

      const { data: insertedImages, error: insertError } = await supabase
        .from('item_images')
        .insert(imageData)
        .select('id, url');

      if (insertError) {
        console.error('[ItemDetail] Error inserting images:', insertError);
        throw insertError;
      }

      // Reload item data to get updated images
      const itemRes = await getItemDetails(item.id);
      if (itemRes.res_code === 200 && itemRes.item) {
        const baseItem = itemRes.item;
        
        // Get tags
        const { data: tagData } = await supabase
          .from("item_tags")
          .select("tag")
          .eq("item_id", item.id);
        const tagsList = tagData?.map((row) => row.tag) || [];
        
        setItem({
          ...baseItem,
          image_url: baseItem.image_url || baseItem.images?.[0]?.url || null,
          images: baseItem.images || [],
          tags: baseItem.tags || tagsList,
          seller_id: baseItem.seller_id || baseItem.seller?.id || null,
          seller_display_name:
            baseItem.seller_display_name ||
            baseItem.seller?.display_name ||
            null,
          seller_trust_score:
            baseItem.seller_trust_score ??
            baseItem.seller?.trust_score ??
            null,
        });
      }
    } catch (err) {
      console.error('[ItemDetail] Error adding image:', err);
      alert(err.message || 'Failed to add image');
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleDeleteImage = async (imageId, imageIndex) => {
    if (!item || !isEditing) return;
    
    const confirmed = window.confirm('Delete this image? This action cannot be undone.');
    if (!confirmed) return;

    console.log('[ItemDetail] handleDeleteImage called:', { imageId, imageIndex, itemId: item.id });

    try {
      const res = await deleteItemImage(imageId);
      console.log('[ItemDetail] deleteItemImage response:', res);
      
      if (res.res_code === 200) {
        // Reload item data from server to ensure consistency
        console.log('[ItemDetail] Reloading item data...');
        const itemRes = await getItemDetails(item.id);
        console.log('[ItemDetail] getItemDetails response:', itemRes);
        
        if (itemRes.res_code === 200 && itemRes.item) {
          const baseItem = itemRes.item;
          
          // Get tags
          const { data: tagData } = await supabase
            .from("item_tags")
            .select("tag")
            .eq("item_id", item.id);
          const tagsList = tagData?.map((row) => row.tag) || [];
          
          console.log('[ItemDetail] Updated images count:', baseItem.images?.length);
          
          setItem({
            ...baseItem,
            image_url: baseItem.image_url || baseItem.images?.[0]?.url || null,
            images: baseItem.images || [],
            tags: baseItem.tags || tagsList,
            seller_id: baseItem.seller_id || baseItem.seller?.id || null,
            seller_display_name:
              baseItem.seller_display_name ||
              baseItem.seller?.display_name ||
              null,
            seller_trust_score:
              baseItem.seller_trust_score ??
              baseItem.seller?.trust_score ??
              null,
          });
          
          // Adjust selected image index if needed
          const newImagesLength = baseItem.images?.length || 0;
          if (selectedImageIndex >= newImagesLength && newImagesLength > 0) {
            setSelectedImageIndex(newImagesLength - 1);
          } else if (newImagesLength === 0) {
            setSelectedImageIndex(0);
          }
        } else {
          console.error('[ItemDetail] Failed to reload item data:', itemRes);
          alert('Image deleted but failed to reload. Please refresh the page.');
        }
      } else {
        console.error('[ItemDetail] Delete failed:', res);
        alert(res.res_msg || 'Failed to delete image');
      }
    } catch (e) {
      console.error('[ItemDetail] Exception in handleDeleteImage:', e);
      alert(e.message || 'Failed to delete image');
    }
  };

  return (
    <div className="item-detail-wrapper">
      <Navbar />
      <div className="item-detail-container">
        <div className="item-detail-content">

          {/* Item Details */}
          <div className="item-main">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 className="item-title">{item.title}</h2>
              {(item?.seller_id && currentUserId && String(item.seller_id) === String(currentUserId)) || isAdmin ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="item-edit-btn" 
                    onClick={startEditing}
                    style={{ 
                      padding: '8px 16px', 
                      backgroundColor: '#007bff', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '5px', 
                      cursor: 'pointer' 
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    className="item-delete-btn" 
                    onClick={handleDelete}
                    style={{ 
                      padding: '8px 16px', 
                      backgroundColor: '#dc3545', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '5px', 
                      cursor: 'pointer' 
                    }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
            {/* Image Gallery */}
            <div className="item-image-section">
              {item.images && item.images.length > 0 ? (
                <>
                  {/* Main Image */}
                  <div className="item-main-image-container" style={{ position: 'relative' }}>
                    <img
                      src={item.images[selectedImageIndex]?.url || item.images[0]?.url}
                      alt={item.title}
                      className="item-main-image"
                      onClick={() => {
                        if (isEditing && item.images[selectedImageIndex]?.id) {
                          handleDeleteImage(item.images[selectedImageIndex].id, selectedImageIndex);
                        }
                      }}
                      style={{
                        cursor: isEditing && item.images[selectedImageIndex]?.id ? 'pointer' : 'default'
                      }}
                    />
                    {isEditing && item.images && item.images.length > 0 && item.images[selectedImageIndex]?.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.images[selectedImageIndex]?.id) {
                            handleDeleteImage(item.images[selectedImageIndex].id, selectedImageIndex);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(220, 53, 69, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          zIndex: 10
                        }}
                      >
                        Click to Delete
                      </button>
                    )}
                  </div>
                  {/* Thumbnail Gallery */}
                  <div className="item-image-thumbnails">
                    {item.images.map((img, index) => (
                      <img
                        key={img.id || index}
                        src={img.url}
                        alt={`${item.title} - Image ${index + 1}`}
                        className={`item-thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                        onClick={() => {
                          if (!isEditing) {
                            setSelectedImageIndex(index);
                          }
                        }}
                        style={{
                          cursor: isEditing ? 'default' : 'pointer'
                        }}
                      />
                    ))}
                    {isEditing && (
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '80px',
                          height: '80px',
                          border: '2px dashed #ddd',
                          borderRadius: '8px',
                          cursor: uploadingImage ? 'not-allowed' : 'pointer',
                          backgroundColor: uploadingImage ? '#f5f5f5' : '#f5f5f5',
                          color: '#666',
                          fontSize: '12px',
                          textAlign: 'center',
                          opacity: uploadingImage ? 0.6 : 1,
                          flexShrink: 0
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleAddImage}
                          disabled={uploadingImage}
                          style={{ display: 'none' }}
                        />
                        {uploadingImage ? 'Uploading...' : '+ Add Image'}
                      </label>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={item.image_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23cccccc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" fill="%23666666" style="font-family:system-ui%2C%20-apple-system%2C%20Segoe%20UI%2C%20Roboto%2C%20Noto%20Sans%2C%20Helvetica%20Neue%2C%20Arial%2C%20sans-serif;">No Image</text></svg>'}
                    alt={item.title}
                    className="item-main-image"
                  />
                  {isEditing && (
                    <div className="item-image-thumbnails">
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '80px',
                          height: '80px',
                          border: '2px dashed #ddd',
                          borderRadius: '8px',
                          cursor: uploadingImage ? 'not-allowed' : 'pointer',
                          backgroundColor: uploadingImage ? '#f5f5f5' : '#f5f5f5',
                          color: '#666',
                          fontSize: '12px',
                          textAlign: 'center',
                          opacity: uploadingImage ? 0.6 : 1,
                          flexShrink: 0
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleAddImage}
                          disabled={uploadingImage}
                          style={{ display: 'none' }}
                        />
                        {uploadingImage ? 'Uploading...' : '+ Add Image'}
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
            {isEditing ? (
              <div className="item-edit-form" style={{ marginTop: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
                <input
                  className="item-edit-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title"
                  maxLength={200}
                  style={{ width: '100%', padding: '10px', marginBottom: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <textarea
                  className="item-edit-textarea"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  rows={6}
                  style={{ width: '100%', padding: '10px', marginBottom: '10px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical' }}
                />
                <input
                  type="number"
                  className="item-edit-price"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="Price"
                  min="0"
                  step="1"
                  style={{ width: '100%', padding: '10px', marginBottom: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <div className="item-edit-actions" style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="item-save-btn" 
                    onClick={saveEdit} 
                    disabled={savingEdit}
                    style={{ 
                      padding: '10px 20px', 
                      backgroundColor: '#28a745', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '5px', 
                      cursor: savingEdit ? 'not-allowed' : 'pointer',
                      opacity: savingEdit ? 0.6 : 1
                    }}
                  >
                    {savingEdit ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    className="item-cancel-btn" 
                    onClick={cancelEditing} 
                    disabled={savingEdit}
                    style={{ 
                      padding: '10px 20px', 
                      backgroundColor: '#6c757d', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '5px', 
                      cursor: savingEdit ? 'not-allowed' : 'pointer',
                      opacity: savingEdit ? 0.6 : 1
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="item-desc">{item.description}</p>
                <p><b>Category:</b> {item.category || "N/A"}</p>
                <p><b>Price:</b> {item.price ? `${item.price}₩` : "N/A"}</p>
              </>
            )}
            <p>
              <b>Seller:</b>{" "}
              {item.seller_display_name ||
                item.seller?.display_name ||
                item.seller_name ||
                item.users?.display_name ||
                "Unknown seller"}
              {item.seller_trust_score != null ||
              item.seller?.trust_score != null ||
              item.users?.trust_score != null
                ? ` (Reputation: ${
                    item.seller_trust_score ??
                    item.seller?.trust_score ??
                    item.users?.trust_score ??
                    0
                  }/5.0)`
                : null}
            </p>
            <p className="itemTags"><b>Tags:</b> {item.tags?.join(", ") || "N/A"}</p>
            <div className="interact-container row">
              <button
                type="button"
                className="item-favorite col-lg-1"
                onClick={handleToggleFavorite}
                disabled={favLoading}
                style={{ cursor: favLoading ? 'not-allowed' : 'pointer' }}
              >
                <div className={`bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'}`} id="fav"></div>
                <div>{isFavorite ? 'Favorited' : 'Favorite'}</div>
              </button>
            {item?.seller_id && currentUserId && String(item.seller_id) !== String(currentUserId) ? (
              <button
                className="item-contact col-lg-1"
                onClick={handleContactSeller}
                disabled={contacting}
                type="button"
              >
                <div className="bi bi-chat-left-dots-fill"></div>
                <div>{contacting ? "Contacting..." : "Contact"}</div>
              </button>
            ) : null}
            </div>
          </div>

          {/* Similar Items Recommendation */}
          <div className="similar-section">
            <h3>🧠 Similar Items</h3>
            <div className="similar-grid">
              {similar.length === 0 && <p>No similar items found.</p>}
              {similar.map((sim) => (
                <div
                  key={sim.id}
                  className="similar-card"
                  onClick={() => navigate(`/item/${sim.id}`)} // Navigate on click
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={sim.image_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="100%" height="100%" fill="%23cccccc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%23666666" style="font-family:system-ui%2C%20-apple-system%2C%20Segoe%20UI%2C%20Roboto%2C%20Noto%20Sans%2C%20Helvetica%20Neue%2C%20Arial%2C%20sans-serif;">No Image</text></svg>'}
                    alt={sim.title}
                    className="similar-img"
                  />
                  <div className="similar-info">
                    <p className="similar-title">{sim.title}</p>
                    <p className="similar-price">
                      {sim.price ? `${sim.price}₩` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ItemDetail;
