import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { db } from './firebase';
import { collection, addDoc, getDocs, updateDoc, doc, onSnapshot, query, orderBy, arrayUnion } from "firebase/firestore";
import { translations } from './translations';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Custom Marker Icon
const catIcon = new L.DivIcon({
    className: 'custom-cat-icon',
    html: `<div style="background: white; border: 2px solid #FFD700; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">🐱</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

// Component to handle map FlyTo actions
// Component to handle map FlyTo actions
function MapController({ selectedCat, markersRef, searchResult }) {
    const map = useMap();
    useEffect(() => {
        if (selectedCat && markersRef.current[selectedCat.id]) {
            map.flyTo([selectedCat.lat, selectedCat.lng], 16, {
                duration: 1.5
            });
            const marker = markersRef.current[selectedCat.id];
            if (marker) {
                // Determine if we should open popup based on screen size or just let standard behavior work
                // On mobile, we use bottom sheet, so no popup. On desktop, we want popup.
                if (window.innerWidth >= 768) {
                    setTimeout(() => marker.openPopup(), 1500);
                }
            }
        }
    }, [selectedCat, map, markersRef]);

    useEffect(() => {
        if (searchResult) {
            map.flyTo([searchResult.lat, searchResult.lng], 15, {
                duration: 1.5
            });
        }
    }, [searchResult, map]);

    return null;
}

function MapEvents({ onMapClick, isAdding, setIsAdding }) {
    useMapEvents({
        click(e) {
            if (isAdding) {
                onMapClick(e.latlng);
            }
        },
        keydown(e) {
            if (e.originalEvent.key === 'Escape') {
                setIsAdding(false);
            }
        }
    });
    return null;
}

function App() {
    const [cats, setCats] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [tempCoords, setTempCoords] = useState(null);
    const [editingId, setEditingId] = useState(null); // Track which cat is being edited
    const [lang, setLang] = useState('ko'); // Language state: 'ko' or 'en'

    // Urgent Fix: Missing States
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // New State for Responsive UI
    const [selectedCat, setSelectedCat] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const markersRef = useRef({});

    const t = translations[lang];

    const toggleLang = () => {
        setLang(prev => prev === 'ko' ? 'en' : 'ko');
    };

    // Cat Search State (Sidebar)
    const [catSearchQuery, setCatSearchQuery] = useState('');

    // Search State (Location)
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                setSearchResult({ lat: parseFloat(lat), lng: parseFloat(lon), timestamp: Date.now() });
            } else {
                alert(t.searchNoResult || "장소를 찾을 수 없습니다.");
            }
        } catch (error) {
            console.error("Search failed:", error);
            alert("검색 중 오류가 발생했습니다.");
        }
    };

    // Handle Resize
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [formData, setFormData] = useState({
        name: '',
        desc: '',
        condition: '좋음',
        neutered: '확인됨(TNR 완료)',
        photo: '',
        foundDate: new Date().toISOString().split('T')[0],
        foundTime: '12:00',
        needs: '없음', // '중성화 필요', '즉시 치료 필요', '주기적 길냥이 집사 필요', '직접 입력', '없음'
        customNeeds: '',
        helpers: 0,
        caretakers: 0,
        phone: '',
    });

    const [showCareModal, setShowCareModal] = useState(false);
    const [currentCat, setCurrentCat] = useState(null);
    const [careForm, setCareForm] = useState({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].slice(0, 5)
    });

    // 도움 주기 모달 상태
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [helpForm, setHelpForm] = useState({ phone: '' });

    // 1. 데이터 불러오기 (실시간 업데이트 버전)
    useEffect(() => {
        const q = query(collection(db, "cats"), orderBy("id", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const catArray = [];
            querySnapshot.forEach((doc) => {
                catArray.push({ ...doc.data(), firestoreId: doc.id });
            });
            setCats(catArray);
        });
        return () => unsubscribe(); // 컴포넌트 닫힐 때 연결 해제
    }, []);

    const handleManualAdd = () => {
        setIsAdding(true);
        setEditingId(null);
        setFormData({
            name: '',
            desc: '',
            condition: '좋음',
            neutered: '확인됨(TNR 완료)',
            photo: '',
            foundDate: new Date().toISOString().split('T')[0],
            foundTime: '12:00',
            needs: '없음',
            customNeeds: '',
            helpers: 0,
            caretakers: 0,
            phone: '',
        });
    };

    const handleMapClick = (latlng) => {
        setTempCoords(latlng);
        setEditingId(null);
        setFormData({
            name: '',
            desc: '',
            condition: '좋음',
            neutered: '확인됨(TNR 완료)',
            photo: '',
            foundDate: new Date().toISOString().split('T')[0],
            foundTime: '12:00',
            needs: '없음',
            customNeeds: '',
            helpers: 0,
            caretakers: 0,
            phone: '',
        });
        setShowModal(true);
        setIsAdding(false);
    };

    const handleEdit = (cat) => {
        setEditingId(cat.id);
        setFormData({
            name: cat.name,
            desc: cat.desc,
            condition: cat.condition,
            neutered: cat.neutered,
            photo: cat.photo,
            foundDate: cat.foundDate || new Date().toISOString().split('T')[0],
            foundTime: cat.foundTime || '12:00',
            needs: cat.needs || '없음',
            customNeeds: cat.customNeeds || '',
            helpers: cat.helpers || 0,
            caretakers: cat.caretakers || 0,
            phone: cat.phone || '',
        });
        setTempCoords({ lat: cat.lat, lng: cat.lng });
        setShowModal(true);
    };

    const handleMarkerClick = (cat) => {
        setSelectedCat(cat);
    };

    const handleOpenHelpModal = (cat) => {
        setCurrentCat(cat);
        setHelpForm({ phone: '' });
        setShowHelpModal(true);
    };

    const handleSubmitHelp = async (e) => {
        e.preventDefault();
        if (!currentCat) return;

        try {
            const catRef = doc(db, "cats", currentCat.firestoreId);
            await updateDoc(catRef, {
                helpers: (currentCat.helpers || 0) + 1,
                helpersList: arrayUnion({
                    phone: helpForm.phone,
                    createdAt: new Date()
                })
            });
            setShowHelpModal(false);
            alert(t.alertThanks);
        } catch (error) {
            console.error("Error updating helpers:", error);
            alert(t.alertError);
        }
    };

    const handleOpenCareModal = (cat) => {
        setCurrentCat(cat);
        setCareForm({
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().split(' ')[0].slice(0, 5)
        });
        setShowCareModal(true);
    };

    const handleSubmitCare = async (e) => {
        e.preventDefault();
        if (!currentCat) return;

        try {
            const catRef = doc(db, "cats", currentCat.firestoreId);
            await updateDoc(catRef, {
                caretakers: (currentCat.caretakers || 0) + 1,
                careHistory: arrayUnion({
                    date: careForm.date,
                    time: careForm.time,
                    createdAt: new Date()
                })
            });
            setShowCareModal(false);
            alert(t.alertCare);
        } catch (error) {
            console.error("Error updating care history:", error);
            alert(t.alertError);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingId) {
                // 수정 모드
                const catRef = doc(db, "cats", cats.find(c => c.id === editingId).firestoreId);
                await updateDoc(catRef, formData);
            } else {
                // 새 등록 모드
                await addDoc(collection(db, "cats"), {
                    ...formData,
                    id: Date.now(),
                    lat: tempCoords.lat,
                    lng: tempCoords.lng,
                    createdAt: new Date()
                });
            }
            setShowModal(false);
            setShowToast(true);
            setFormData({
                name: '',
                desc: '',
                condition: '좋음',
                neutered: '확인됨(TNR 완료)',
                photo: '',
                foundDate: new Date().toISOString().split('T')[0],
                foundTime: '12:00',
                needs: '없음',
                customNeeds: '',
                helpers: 0,
                caretakers: 0,
                phone: '',
            });
            setEditingId(null);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            console.error("Error saving document: ", error);
            alert(t.alertSaveError);
        }
    };

    const renderCatDetails = (cat) => (
        <div className="cat-details-content">
            {cat.photo && <img src={cat.photo} alt={cat.name} className="cat-detail-img" />}
            <h3>{cat.name}</h3>
            <p className="cat-detail-meta">
                {t.foundAt} {cat.foundDate} {cat.foundTime}
            </p>
            <p className="cat-detail-desc">{cat.desc}</p>
            <div className="cat-badges">
                <span className="badge">{t.status}: {cat.condition}</span>
                <span className="badge">{t.tnr}: {cat.neutered}</span>
            </div>
            <div className="cat-needs-section">
                {cat.needs && cat.needs !== '없음' && (
                    <div className="needs-box">
                        {cat.needs === '중성화 필요' || cat.needs === '즉시 치료 필요' ? (
                            <>
                                <span className="needs-urgent">{t.helpReq}</span>
                                <div className="needs-text">
                                    {cat.needs} ({cat.helpers || 0}{t.helpers})
                                </div>
                                {cat.helpersList && cat.helpersList.length > 0 && (
                                    <div className="helpers-list">
                                        <strong>{t.helpersList}</strong>
                                        <ul>
                                            {cat.helpersList.map((helper, idx) => (
                                                <li key={idx}>{helper.phone}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <button
                                    onClick={() => handleOpenHelpModal(cat)}
                                    className="action-btn help-btn"
                                >
                                    {t.btnHelp}
                                </button>
                            </>
                        ) : cat.needs === '주기적 길냥이 집사 필요' ? (
                            <>
                                <span className="care-req-title">{t.careReq}</span>
                                <div className="needs-text">
                                    {cat.needs} ({cat.caretakers || 0}{t.careCount})
                                </div>
                                {cat.careHistory && cat.careHistory.length > 0 && (
                                    <div
                                        className="care-history"
                                        onClick={() => setShowHistoryModal(true)}
                                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        {t.lastMeal} {cat.careHistory[cat.careHistory.length - 1].date} {cat.careHistory[cat.careHistory.length - 1].time}
                                    </div>
                                )}
                                <button
                                    onClick={() => handleOpenCareModal(cat)}
                                    className="action-btn care-btn"
                                >
                                    {t.btnRecordCare}
                                </button>
                            </>
                        ) : cat.needs === '직접 입력' ? (
                            <>
                                <strong>{t.otherNeeds}</strong> {cat.customNeeds}
                            </>
                        ) : (
                            <span>{cat.needs}</span>
                        )}
                    </div>
                )}
            </div>
            {cat.phone && (
                <div className="contact-box">
                    📞 {cat.phone}
                </div>
            )}
            <button
                onClick={() => handleEdit(cat)}
                className="edit-btn"
            >
                {t.btnEdit}
            </button>
        </div>
    );

    return (
        <div className="app-container">
            <button className="lang-toggle" onClick={toggleLang}>
                {lang === 'ko' ? 'English' : '한국어'}
            </button>

            {/* Sidebar (Desktop Only via CSS) */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1>{t.appTitle}</h1>
                    <p>{t.headerDescDefault}</p>
                    <div className="sidebar-search">
                        <input
                            type="text"
                            placeholder={t.catSearchPlaceholder}
                            value={catSearchQuery}
                            onChange={(e) => setCatSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="cat-list">
                    {cats
                        .filter(cat => cat.name.toLowerCase().includes(catSearchQuery.toLowerCase()))
                        .map(cat => (
                            <div key={cat.id} className="cat-card" onClick={() => setSelectedCat(cat)}>
                                <div className="cat-info-row">
                                    <span className="cat-label">{t.labelName}:</span>
                                    <span className="cat-value"><strong>{cat.name}</strong></span>
                                </div>
                                <div className="cat-info-row">
                                    <span className="cat-label">{t.labelFirstFound}:</span>
                                    <span className="cat-value">{cat.foundDate}</span>
                                </div>
                                <div className="cat-info-row">
                                    <span className="cat-label">{t.labelDesc}:</span>
                                    <span className="cat-value desc-text">{cat.desc}</span>
                                </div>
                                <div className="cat-info-row">
                                    <span className="cat-label">{t.labelStatusSidebar}:</span>
                                    <span className="cat-value">
                                        <span className={`status-dot ${cat.condition === '좋음' ? 'good' : 'bad'}`}></span>
                                        {cat.condition}
                                    </span>
                                </div>
                                {cat.needs && cat.needs !== '없음' && cat.needs !== 'None' && (
                                    <div className="cat-info-row needs-row">
                                        <span className="cat-label">{t.labelNeeds}:</span>
                                        <span className="cat-value needs-text">
                                            {cat.needs === '직접 입력' || cat.needs === 'Custom Input' ? cat.customNeeds : cat.needs}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    {cats.filter(cat => cat.name.toLowerCase().includes(catSearchQuery.toLowerCase())).length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                            {lang === 'en' ? 'No cats found.' : '검색 결과가 없습니다.'}
                        </div>
                    )}
                </div>
            </aside>

            <div className="map-wrapper">
                <MapContainer
                    center={[37.5708, 126.9801]}
                    zoom={17}
                    minZoom={15}
                    maxBounds={[[33, 124], [43, 132]]}
                    id="map-container"
                    className={isAdding ? 'cursor-crosshair' : ''}
                    zoomControl={false}
                >
                    {/* 1. Base Layer: Clean Background (No Labels) */}
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                        attribution='&copy; OpenStreetMap'
                        className="map-base-layer"
                        zIndex={1}
                    />

                    {/* 2. Label Layer: Crisp Text Overlay */}
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                        className="map-label-layer"
                        zIndex={100}
                    />
                    <MapEvents onMapClick={handleMapClick} isAdding={isAdding} setIsAdding={setIsAdding} />
                    <MapController selectedCat={selectedCat} markersRef={markersRef} searchResult={searchResult} />

                    {cats.map((cat) => (
                        <Marker
                            key={cat.id}
                            position={[cat.lat, cat.lng]}
                            icon={catIcon}
                            ref={el => markersRef.current[cat.id] = el}
                            eventHandlers={{
                                click: () => handleMarkerClick(cat)
                            }}
                        >
                            {/* Only render Popup on Desktop because Mobile uses Bottom Sheet */}
                            {!isMobile && (
                                <Popup>
                                    <div className="cat-popup">
                                        {renderCatDetails(cat)}
                                    </div>
                                </Popup>
                            )}
                        </Marker>
                    ))}
                </MapContainer>

                <div className="search-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t.searchPlaceholder || "Search location..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="search-btn" onClick={handleSearch}>
                        🔍
                    </button>
                </div>

                <div className="fab-container">
                    <button className="add-fab" onClick={handleManualAdd}>
                        <span>+</span>
                    </button>
                    {isAdding && <div className="fab-tooltip">{t.headerDescAdding}</div>}
                </div>

                {/* Mobile Bottom Sheet */}
                {isMobile && selectedCat && (
                    <div className="bottom-sheet-overlay" onClick={() => setSelectedCat(null)}>
                        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
                            <div className="sheet-handle"></div>
                            <div className="sheet-content">
                                {renderCatDetails(selectedCat)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
                        <h2>{editingId ? t.editTitle : t.addTitle}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>{t.labelName}</label>
                                <input
                                    type="text" required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t.labelDesc}</label>
                                <textarea
                                    required
                                    placeholder={t.placeholderDesc}
                                    value={formData.desc}
                                    onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label>{t.labelNeeds}</label>
                                <select
                                    value={formData.needs}
                                    onChange={(e) => setFormData({ ...formData, needs: e.target.value })}
                                >
                                    <option value="없음">{t.optNone}</option>
                                    <option value="중성화 필요">{t.optNeuter}</option>
                                    <option value="즉시 치료 필요">{t.optTreat}</option>
                                    <option value="주기적 길냥이 집사 필요">{t.optCare}</option>
                                    <option value="직접 입력">{t.optCustom}</option>
                                </select>
                                {formData.needs === '중성화 필요' && (
                                    <p style={{ marginTop: '5px', fontSize: '0.8rem', color: '#e17055' }}>
                                        {t.noticeNeuter}
                                    </p>
                                )}
                                {formData.needs === '직접 입력' && (
                                    <input
                                        type="text"
                                        style={{ marginTop: '5px' }}
                                        placeholder={t.labelCustomNeeds}
                                        required
                                        value={formData.customNeeds}
                                        onChange={(e) => setFormData({ ...formData, customNeeds: e.target.value })}
                                    />
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div className="form-group">
                                    <label>{t.labelFoundDate}</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.foundDate}
                                        onChange={(e) => setFormData({ ...formData, foundDate: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t.labelFoundTime}</label>
                                    <select
                                        required
                                        value={formData.foundTime}
                                        onChange={(e) => setFormData({ ...formData, foundTime: e.target.value })}
                                    >
                                        {Array.from({ length: 24 }).map((_, i) => {
                                            const hour = i.toString().padStart(2, '0');
                                            return <option key={i} value={`${hour}:00`}>{`${hour}:00`}</option>;
                                        })}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div className="form-group">
                                    <label>{t.labelCondition}</label>
                                    <select
                                        required
                                        value={formData.condition}
                                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                    >
                                        <option value="좋음">{t.optGood}</option><option value="보통">{t.optAvg}</option><option value="마름">{t.optThin}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t.labelNeutered}</label>
                                    <select
                                        required
                                        value={formData.neutered}
                                        onChange={(e) => setFormData({ ...formData, neutered: e.target.value })}
                                    >
                                        <option value="확인됨(TNR 완료)">{t.optVerified}</option><option value="미완료">{t.optNotDone}</option><option value="모름">{t.optUnknown}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t.labelPhoto}</label>
                                <input
                                    type="url"
                                    value={formData.photo}
                                    onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t.labelPhone}</label>
                                <input
                                    type="tel"
                                    placeholder={t.placeholderPhone}
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="submit-btn">
                                {editingId ? t.submitUpdate : t.submitAdd}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showCareModal && (
                <div className="modal-overlay" onClick={() => setShowCareModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '300px' }}>
                        <h3>{t.careTitle}</h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                            {t.careDesc}
                        </p>
                        <form onSubmit={handleSubmitCare}>
                            <div className="form-group">
                                <label>{t.labelDate}</label>
                                <input
                                    type="date"
                                    required
                                    value={careForm.date}
                                    onChange={(e) => setCareForm({ ...careForm, date: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t.labelTime}</label>
                                <input
                                    type="time"
                                    required
                                    value={careForm.time}
                                    onChange={(e) => setCareForm({ ...careForm, time: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="submit-btn" style={{ background: '#55efc4', color: '#2d3436' }}>
                                {t.btnComplete}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showHelpModal && (
                <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '300px' }}>
                        <h3>{t.helpTitle}</h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                            {t.helpDesc}
                        </p>
                        <form onSubmit={handleSubmitHelp}>
                            <div className="form-group">
                                <label>{t.labelContact}</label>
                                <input
                                    type="tel"
                                    required
                                    placeholder={t.placeholderContact}
                                    value={helpForm.phone}
                                    onChange={(e) => setHelpForm({ ...helpForm, phone: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="submit-btn" style={{ background: '#ff7675', color: 'white' }}>
                                {t.btnRegisterHelp}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showHistoryModal && selectedCat && (
                <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '350px', maxHeight: '60vh', overflowY: 'auto' }}>
                        <button className="modal-close-btn" onClick={() => setShowHistoryModal(false)}>✕</button>
                        <h3>{t.historyTitle}</h3>
                        {selectedCat.careHistory && selectedCat.careHistory.length > 0 ? (
                            <ul className="history-list">
                                {[...selectedCat.careHistory].reverse().map((record, idx) => (
                                    <li key={idx} className="history-item">
                                        ⏱ {record.date} {record.time}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>{t.historyEmpty}</p>
                        )}
                    </div>
                </div>
            )}

            {showToast && (
                <div className="toast">
                    <span className="v-mark">V</span>
                    <span>{t.toastSubmitted}</span>
                </div>
            )}
        </div>
    );
}

export default App;
