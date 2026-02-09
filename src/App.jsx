import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { db } from './firebase';
import { collection, addDoc, getDocs, updateDoc, doc, onSnapshot, query, orderBy, arrayUnion } from "firebase/firestore";

// Custom Marker Icon
const catIcon = new L.DivIcon({
    className: 'custom-cat-icon',
    html: `<div style="background: white; border: 2px solid #ff9f43; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">🐱</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

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

    const [formData, setFormData] = useState({
        name: '',
        desc: '',
        condition: '좋음',
        neutered: '확인됨(TNR 완료)',
        photo: '',
        foundDate: new Date().toISOString().split('T')[0],
        foundTime: '12:00',
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
            alert("도움을 주셔서 감사합니다! 🐾 연락처가 등록되었습니다.");
        } catch (error) {
            console.error("Error updating helpers:", error);
            alert("오류가 발생했습니다.");
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
            alert("돌봄 기록이 등록되었습니다! 🍚💧");
        } catch (error) {
            console.error("Error updating care history:", error);
            alert("오류가 발생했습니다.");
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
            alert("저장에 실패했습니다. 콘솔을 확인해주세요.");
        }
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

            <div className={`map-wrapper ${isAdding ? 'cursor-crosshair' : ''}`}>
                <MapContainer
                    center={[36.5, 127.8]}
                    zoom={7}
                    minZoom={6}
                    maxBounds={[[33, 124], [43, 132]]}
                    id="map-container"
                >
                    <TileLayer
                        url="https://xdworld.vworld.kr/2d/Base/service/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="http://www.vworld.kr/">vworld</a>'
                        className="monochrome-tile"
                    />
                    <MapEvents onMapClick={handleMapClick} isAdding={isAdding} setIsAdding={setIsAdding} />

                    {cats.map((cat) => (
                        <Marker key={cat.id} position={[cat.lat, cat.lng]} icon={catIcon}>
                            <Popup>
                                <div className="cat-popup">
                                    {cat.photo && <img src={cat.photo} alt={cat.name} />}
                                    <h3>{cat.name}</h3>
                                    <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px' }}>
                                        🕒 (첫 발견 시기) {cat.foundDate} {cat.foundTime}
                                    </p>
                                    <p>{cat.desc}</p>
                                    <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                                        <span className="badge">Status: {cat.condition}</span>
                                        <span className="badge">TNR: {cat.neutered}</span>
                                    </div>
                                    <div style={{ marginBottom: '10px' }}>
                                        {cat.needs && cat.needs !== '없음' && (
                                            <div style={{ padding: '8px', background: '#ffe4c4', borderRadius: '5px', fontSize: '0.9rem' }}>
                                                {cat.needs === '중성화 필요' || cat.needs === '즉시 치료 필요' ? (
                                                    <>
                                                        <span style={{ color: '#d35400', fontWeight: 'bold' }}>🆘 집사 도움 요청</span>
                                                        <div style={{ marginTop: '5px' }}>
                                                            {cat.needs} ({cat.helpers || 0}명 참여 중)
                                                        </div>
                                                        {cat.helpersList && cat.helpersList.length > 0 && (
                                                            <div style={{ marginTop: '5px', fontSize: '0.8rem', background: '#fff', padding: '5px', borderRadius: '3px' }}>
                                                                <strong>📞 도움 주시는 분들:</strong>
                                                                <ul style={{ margin: '5px 0 0 0', paddingLeft: '15px' }}>
                                                                    {cat.helpersList.map((helper, idx) => (
                                                                        <li key={idx}>{helper.phone}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => handleOpenHelpModal(cat)}
                                                            style={{
                                                                marginTop: '5px',
                                                                width: '100%',
                                                                padding: '5px',
                                                                background: '#ff7675',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '3px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            🙌 도움 주기
                                                        </button>
                                                    </>
                                                ) : cat.needs === '주기적 길냥이 집사 필요' ? (
                                                    <>
                                                        <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>🏠 집사 모집 중</span>
                                                        <div style={{ marginTop: '5px' }}>
                                                            {cat.needs} ({cat.caretakers || 0}회 돌봄)
                                                        </div>
                                                        {cat.careHistory && cat.careHistory.length > 0 && (
                                                            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '3px' }}>
                                                                🥣 최근 식사: {cat.careHistory[cat.careHistory.length - 1].date} {cat.careHistory[cat.careHistory.length - 1].time}
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => handleOpenCareModal(cat)}
                                                            style={{
                                                                marginTop: '5px',
                                                                width: '100%',
                                                                padding: '5px',
                                                                background: '#55efc4',
                                                                color: '#2d3436',
                                                                border: 'none',
                                                                borderRadius: '3px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            🍚 밥/물 줬어요 (기록)
                                                        </button>
                                                    </>
                                                ) : cat.needs === '직접 입력' ? (
                                                    <>
                                                        <strong>기타 필요사항:</strong> {cat.customNeeds}
                                                    </>
                                                ) : (
                                                    <span>{cat.needs}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ marginBottom: '10px' }}>
                                        {cat.phone && (
                                            <div style={{ padding: '5px', background: '#e1f5fe', borderRadius: '5px', fontSize: '0.8rem', color: '#0288d1' }}>
                                                📞 {cat.phone}
                                            </div>
                                        )}
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
                                    placeholder="ex) 고등어, 오른쪽 눈 다침"
                                    value={formData.desc}
                                    onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label>필요사항</label>
                                <select
                                    value={formData.needs}
                                    onChange={(e) => setFormData({ ...formData, needs: e.target.value })}
                                >
                                    <option value="없음">없음(선택 안 함)</option>
                                    <option value="중성화 필요">중성화 필요</option>
                                    <option value="즉시 치료 필요">즉시 치료 필요</option>
                                    <option value="주기적 길냥이 집사 필요">주기적 길냥이 집사 필요</option>
                                    <option value="직접 입력">직접 입력</option>
                                </select>
                                {formData.needs === '중성화 필요' && (
                                    <p style={{ marginTop: '5px', fontSize: '0.8rem', color: '#e17055' }}>
                                        📢 중성화 전 해당 구청 담당부서에 지원 문의를 해보세요!
                                    </p>
                                )}
                                {formData.needs === '직접 입력' && (
                                    <input
                                        type="text"
                                        style={{ marginTop: '5px' }}
                                        placeholder="필요한 사항을 직접 입력해주세요"
                                        required
                                        value={formData.customNeeds}
                                        onChange={(e) => setFormData({ ...formData, customNeeds: e.target.value })}
                                    />
                                )}
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
                                    <label>영양 상태</label>
                                    <select
                                        required
                                        value={formData.condition}
                                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                    >
                                        <option>좋음</option><option>보통</option><option>마름</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>중성화</label>
                                    <select
                                        required
                                        value={formData.neutered}
                                        onChange={(e) => setFormData({ ...formData, neutered: e.target.value })}
                                    >
                                        <option>확인됨(TNR 완료)</option><option>미완료</option><option>모름</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>사진 URL (선택)</label>
                                <input
                                    type="url"
                                    value={formData.photo}
                                    onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>작성자 연락처 (선택)</label>
                                <input
                                    type="tel"
                                    placeholder="(동물병원에 다른 집사와 함께 즉시 방문이 필요한 경우 등 입력)"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="submit-btn">
                                {editingId ? '수정 완료' : '제보 완료'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showCareModal && (
                <div className="modal-overlay" onClick={() => setShowCareModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '300px' }}>
                        <h3>🍚 돌봄 기록 남기기</h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                            오늘 길냥이에게 맛있는 밥과 물을 주셨나요? 시간을 기록해주세요!
                        </p>
                        <form onSubmit={handleSubmitCare}>
                            <div className="form-group">
                                <label>날짜</label>
                                <input
                                    type="date"
                                    required
                                    value={careForm.date}
                                    onChange={(e) => setCareForm({ ...careForm, date: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>시간</label>
                                <input
                                    type="time"
                                    required
                                    value={careForm.time}
                                    onChange={(e) => setCareForm({ ...careForm, time: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="submit-btn" style={{ background: '#55efc4', color: '#2d3436' }}>
                                기록 완료
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showHelpModal && (
                <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '300px' }}>
                        <h3>🆘 도움 주기</h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                            도움을 주실 수 있나요? 다른 집사님들과 소통할 수 있도록 연락처를 남겨주세요.
                        </p>
                        <form onSubmit={handleSubmitHelp}>
                            <div className="form-group">
                                <label>연락처</label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="010-0000-0000"
                                    value={helpForm.phone}
                                    onChange={(e) => setHelpForm({ ...helpForm, phone: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="submit-btn" style={{ background: '#ff7675', color: 'white' }}>
                                도움 등록
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
