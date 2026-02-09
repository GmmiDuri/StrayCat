import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Custom Marker Icon
const catIcon = new L.DivIcon({
    className: 'custom-cat-icon',
    html: `<div style="background: white; border: 2px solid #ff9f43; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">🐱</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

function MapEvents({ onMapClick, isAdding }) {
    useMapEvents({
        click(e) {
            if (isAdding) {
                onMapClick(e.latlng);
            }
        },
    });
    return null;
}

function App() {
    const [cats, setCats] = useState(() => {
        const saved = localStorage.getItem('stray_cats_react');
        return saved ? JSON.parse(saved) : [];
    });
    const [isAdding, setIsAdding] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [tempCoords, setTempCoords] = useState(null);
    const [editingId, setEditingId] = useState(null); // Track which cat is being edited

    const [formData, setFormData] = useState({
        name: '',
        desc: '',
        condition: '좋음',
        neutered: '확인됨(TNR 완료)',
        photo: '',
        foundDate: new Date().toISOString().split('T')[0],
        foundTime: '12:00'
    });

    useEffect(() => {
        localStorage.setItem('stray_cats_react', JSON.stringify(cats));
    }, [cats]);

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
            foundTime: '12:00'
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
            foundTime: '12:00'
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
            foundTime: cat.foundTime || '12:00'
        });
        setTempCoords({ lat: cat.lat, lng: cat.lng });
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingId) {
            // Update existing cat
            setCats(cats.map(cat =>
                cat.id === editingId
                    ? { ...cat, ...formData }
                    : cat
            ));
        } else {
            // Add new cat
            const newCat = {
                ...formData,
                id: Date.now(),
                lat: tempCoords.lat,
                lng: tempCoords.lng,
            };
            setCats([...cats, newCat]);
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
            foundTime: '12:00'
        });
        setEditingId(null);
        setTimeout(() => setShowToast(false), 3000);
    };

    return (
        <div className="app-container">
            <header>
                <h1>🐈 길냥이 지도</h1>
                <p>
                    {isAdding
                        ? "📍 지도의 원하는 위치를 클릭하여 등록을 시작하세요"
                        : "새로운 길냥이를 등록하고 싶다면 아래에 '새로운 길냥이 등록' 버튼을 누른 후 지도를 클릭해주세요"}
                </p>
            </header>

            <div className="map-wrapper">
                <MapContainer
                    center={[36.5, 127.8]}
                    zoom={7}
                    minZoom={6}
                    maxBounds={[[33, 124], [43, 132]]}
                    id="map-container"
                    className={isAdding ? 'cursor-crosshair' : ''}
                >
                    <TileLayer
                        url="https://xdworld.vworld.kr/2d/Base/service/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="http://www.vworld.kr/">vworld</a>'
                        className="monochrome-tile"
                    />
                    <MapEvents onMapClick={handleMapClick} isAdding={isAdding} />

                    {cats.map((cat) => (
                        <Marker key={cat.id} position={[cat.lat, cat.lng]} icon={catIcon}>
                            <Popup>
                                <div className="cat-popup">
                                    {cat.photo && <img src={cat.photo} alt={cat.name} />}
                                    <h3>{cat.name}</h3>
                                    <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px' }}>
                                        🕒 {cat.foundDate} {cat.foundTime}
                                    </p>
                                    <p>{cat.desc}</p>
                                    <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                                        <span className="badge">Status: {cat.condition}</span>
                                        <span className="badge">TNR: {cat.neutered}</span>
                                    </div>
                                    <button
                                        onClick={() => handleEdit(cat)}
                                        style={{
                                            width: '100%',
                                            padding: '5px',
                                            background: '#eee',
                                            border: 'none',
                                            borderRadius: '5px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        ✏️ 정보 수정
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                <div className="controls">
                    <button className="add-btn" onClick={handleManualAdd}>
                        🐾 새로운 길냥이 등록
                    </button>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingId ? '📝 길냥이 정보 수정' : '🏠 길냥이 제보하기'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>이름</label>
                                <input
                                    type="text" required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>특징</label>
                                <textarea
                                    required
                                    value={formData.desc}
                                    onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                                ></textarea>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div className="form-group">
                                    <label>발견 날짜</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.foundDate}
                                        onChange={(e) => setFormData({ ...formData, foundDate: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>발견 시간</label>
                                    <select
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
                                    <label>영양 상태</label>
                                    <select
                                        value={formData.condition}
                                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                    >
                                        <option>좋음</option><option>보통</option><option>마름</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>중성화</label>
                                    <select
                                        value={formData.neutered}
                                        onChange={(e) => setFormData({ ...formData, neutered: e.target.value })}
                                    >
                                        <option>확인됨(TNR 완료)</option><option>미완료</option><option>모름</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>사진 URL</label>
                                <input
                                    type="url"
                                    value={formData.photo}
                                    onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="submit-btn">
                                {editingId ? '수정 완료' : '제보 완료'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showToast && (
                <div className="toast">
                    <span className="v-mark">V</span>
                    <span>제보가 등록되었습니다!</span>
                </div>
            )}
        </div>
    );
}

export default App;
