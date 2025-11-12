import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Option.css';
import { getCurrentUser, getUserPosts, getUserItems, getUserWishlists } from '../../lib/api';

function Option(props) {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const testList = [
        {
            id: 1,
            title: "tst1",
            description: "tst1",
            category: null,
            price: 1
        },
        {
            id: 2,
            title: "tst2",
            description: "tst2",
            category: null,
            price: 2
        },
        {
            id: 3,
            title: "tst3",
            description: "tst3",
            category: null,
            price: 3
        },
        {
            id: 4,
            title: "tst4",
            description: "tst4",
            category: null,
            price: 4
        },
        {
            id: 4,
            title: "tst4",
            description: "tst4",
            category: null,
            price: 4
        },
        {
            id: 4,
            title: "tst4",
            description: "tst4",
            category: null,
            price: 4
        },
        {
            id: 4,
            title: "tst4",
            description: "tst4",
            category: null,
            price: 4
        },
        {
            id: 4,
            title: "tst4",
            description: "tst4",
            category: null,
            price: 4
        },
        {
            id: 4,
            title: "tst4",
            description: "tst4",
            category: null,
            price: 4
        },
        {
            id: 4,
            title: "tst4",
            description: "tst4",
            category: null,
            price: 4
        },
        {
            id: 4,
            title: "tst4",
            description: "tst4",
            category: null,
            price: 4
        },
        {
            id: 4,
            title: "tst4",
            description: "tst4",
            category: null,
            price: 4
        }
    ]
    

    // Determine what to show based on URL or default
    // const isPosts = location.pathname.includes('Posts') || location.search.includes('type=posts');
    // const isItems = location.pathname.includes('History') || location.search.includes('type=items');
    // const isWishlists = location.pathname.includes('Favorite') || location.search.includes('type=wishlists');

    const isMyItems = props.mode == "myItem" ? true : false;
    const isViewedItems = props.mode == "viewedItem" ? true : false;
    const isPosts = props.mode == "post" ? true : false;
    const isFavorite = props.mode == "favorite" ? true : false;

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError('');
            try {
                // Get current user first
                const userRes = await getCurrentUser();
                if (userRes.res_code !== 200) {
                    setError('Please sign in to view your data');
                    setLoading(false);
                    return;
                }

                const currentUser = userRes.user;
                setUser(currentUser);

                // Load appropriate data based on page type
                switch (props.mode) {
                    case "myItem":
                        const res_userItem = await getUserItems(currentUser.id);
                        if (res_userItem.res_code === 200) {
                            const transformed = (res_userItem.items || []).map(item => ({
                                id: item.id,
                                title: item.title,
                                price: item.price,
                                image: (item.item_images && item.item_images[0] && item.item_images[0].url) || null
                            }));
                        setItems(transformed);
                        } 
                        else {
                        setError(res_userItem.res_msg || 'Failed to load items');
                        }
                        break;                   
                    case "post":
                        const res_post = await getUserPosts(currentUser.id);
                        if (res_post.res_code === 200)
                            setItems(res_post.posts || []);
                        else
                            setError(res_post.res_msg || 'Failed to load posts');
                        break;
                    case "favorite":
                        const res_fav = await getUserWishlists(currentUser.id);
                        if (res_fav.res_code === 200) {
                            // Transform wishlists to items format for display
                            const transformed = (res_fav.wishlists || []).map(w => ({
                                id: w.items.id,
                                title: w.items.title,
                                price: w.items.price,
                                image: (w.items.item_images && w.items.item_images[0] && w.items.item_images[0].url) || null
                            }));
                            setItems(transformed);
                        } else {
                            setError(res_fav.res_msg || 'Failed to load wishlists');
                        }
                    default:
                        break;
                }

                // if (isPosts) {
                //     const res = await getUserPosts(currentUser.id);
                //     if (res.res_code === 200) {
                //         setItems(res.posts || []);
                //     } else {
                //         setError(res.res_msg || 'Failed to load posts');
                //     }
                // } else if (isFavorite) {
                //     const res = await getUserWishlists(currentUser.id);
                //     if (res.res_code === 200) {
                //         // Transform wishlists to items format for display
                //         const transformed = (res.wishlists || []).map(w => ({
                //             id: w.items.id,
                //             title: w.items.title,
                //             price: w.items.price,
                //             image: (w.items.item_images && w.items.item_images[0] && w.items.item_images[0].url) || null
                //         }));
                //         setItems(transformed);
                //     } else {
                //         setError(res.res_msg || 'Failed to load wishlists');
                //     }
                // } else {
                //     // Default: User's Item History
                //     const res = await getUserItems(currentUser.id);
                //     if (res.res_code === 200) {
                //         const transformed = (res.items || []).map(item => ({
                //             id: item.id,
                //             title: item.title,
                //             price: item.price,
                //             image: (item.item_images && item.item_images[0] && item.item_images[0].url) || null
                //         }));
                //         setItems(transformed);
                //     } else {
                //         setError(res.res_msg || 'Failed to load items');
                //     }
                // }
            } catch (e) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [props.mode]);

    return (
        <div className="opItems d-flex">
            { testList.map(item => (
                    <div 
                        key={item.id} 
                        className="opItem"
                        onClick={() => navigate(`/item/${item.id}`)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="opImage">
                            <img 
                                src={item.image || 'https://via.placeholder.com/100x100/cccccc/666666?text=No+Image'} 
                                alt={item.title || item.name} 
                            />
                        </div>
                        <div className="opInfo">
                            <h3 className="opName">{item.title || item.name}</h3>
                            <p className="opPrice">{item.price ? `${item.price.toLocaleString()} won` : 'Price not set'}</p>
                            <div className="opSeller">Seller Name</div>
                        </div>
                    </div>
                ))
            }
            

            {/* {items.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No items found</div>
                ) : (
                    items.map(item => (
                        <div 
                            key={item.id} 
                            className="optionItem"
                            onClick={() => navigate(`/item/${item.id}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="optionImage">
                                <img 
                                    src={item.image || 'https://via.placeholder.com/100x100/cccccc/666666?text=No+Image'} 
                                    alt={item.title || item.name} 
                                />
                            </div>
                            <div className="optionInfo">
                                <h3 className="optionName">{item.title || item.name}</h3>
                                <p className="optionPrice">{item.price ? `${item.price.toLocaleString()} won` : 'Price not set'}</p>
                                <div className="item-seller">Seller Name</div>
                            </div>
                        </div>
                    ))
                )} */}
        </div>
    )
}

export default Option;