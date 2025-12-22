# 🔥 Firebase 귀속 요소 및 마이그레이션 가이드

---

## 📊 Firebase 의존 요소 요약

| 컴포넌트 | 귀속도 | 마이그레이션 난이도 | 우선순위 |
|----------|--------|-------------------|----------|
| Firebase Auth | 🔴 높음 | ⭐⭐⭐ | 1 |
| Firestore | 🟡 중간 | ⭐⭐ | 2 |
| Cloud Functions | 🔴 높음 | ⭐⭐⭐⭐ | 3 |
| Security Rules | 🔴 높음 | ⭐⭐ | 4 |
| Hosting | 🟢 낮음 | ⭐ | 5 |

---

## 1. 🔐 Firebase Auth

### 귀속 부분
```typescript
// Firebase 전용 코드
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
const provider = new GoogleAuthProvider();
await signInWithPopup(auth, provider);
```

### 마이그레이션 시 필요 작업
- [ ] 새 OAuth 서버 구축 (Google OAuth 2.0 직접 연동)
- [ ] JWT 토큰 발급 로직 구현
- [ ] 사용자 세션 관리 구현
- [ ] 기존 사용자 email 기준으로 연결

### 주의사항
- Firebase Auth의 `uid`는 Firebase 전용 → 새 시스템에서 자체 `userId` 생성 필요
- 사용자 email로 기존 데이터 연결
- 앱에서 `signInWithPopup` → 새 OAuth 플로우로 교체

---

## 2. 🗄️ Firestore

### 귀속 부분
```typescript
// Firestore 전용 쿼리
import { doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
onSnapshot(doc(db, 'users', id), callback);
query(collection(db, 'listings'), where('status', '==', 'active'));
```

### 마이그레이션 시 필요 작업
- [ ] Firestore → 새 DB로 데이터 내보내기
- [ ] 데이터 스키마 변환 (필요 시)
- [ ] 실시간 리스너 → WebSocket 또는 Polling으로 교체
- [ ] 쿼리 문법 변환

### 데이터 내보내기 방법
```bash
# Firebase CLI로 내보내기
firebase firestore:export gs://bucket-name/backup
```

### 주의사항
- Firestore의 `Timestamp` → ISO 날짜로 변환
- Subcollection → 관계형 DB는 정규화 필요
- 실시간 리스너 의존 코드 많음

---

## 3. ⚡ Cloud Functions

### 귀속 부분
```typescript
// Firebase Functions 전용
import * as functions from 'firebase-functions';

export const onBidCreate = functions.firestore
  .document('listings/{id}/bids/{bidId}')
  .onCreate(handler);
```

### 마이그레이션 시 필요 작업
- [ ] 별도 백엔드 서버 구축 (Node.js/Express 등)
- [ ] Firestore 트리거 → REST API 엔드포인트로 변환
- [ ] Scheduled Functions → Cron Job으로 변환
- [ ] HTTPS Callable → REST API로 변환

### 함수별 변환 가이드

| Firebase Function | 대체 방법 |
|-------------------|----------|
| `firestore.onCreate` | 클라이언트에서 API 호출 |
| `pubsub.schedule` | 서버 Cron Job |
| `https.onCall` | REST API 엔드포인트 |

---

## 4. 🛡️ Security Rules

### 마이그레이션 시 필요 작업
- [ ] 백엔드 API에서 권한 검증 로직 구현
- [ ] 미들웨어로 인증/인가 처리

---

## 📋 마이그레이션 체크리스트

### Phase 1: 준비
- [ ] 새 백엔드 환경 선택 (AWS, GCP 등)
- [ ] 새 DB 선택 (PostgreSQL, MongoDB 등)
- [ ] OAuth 2.0 설정

### Phase 2: 데이터 이전
- [ ] Firestore 데이터 백업
- [ ] 스키마 변환 스크립트 작성
- [ ] email 기준 사용자 ID 매핑

### Phase 3: 백엔드 구축
- [ ] REST API 서버 구축
- [ ] Cloud Functions → API 엔드포인트
- [ ] Cron Job 설정

### Phase 4: 프론트엔드 수정
- [ ] Firebase SDK 제거
- [ ] 인증 로직 교체
- [ ] API 호출 코드 수정
- [ ] 실시간 리스너 → WebSocket 교체

---

## 💰 마이그레이션 예상 비용

| 항목 | 예상 기간 |
|------|----------|
| 백엔드 서버 구축 | 2-3주 |
| 데이터 마이그레이션 | 1주 |
| 프론트엔드 수정 | 1-2주 |
| 테스트 | 1주 |
| **총합** | **5-7주** |

---

## 💡 개발 중 마이그레이션 최소화 팁

1. **데이터 구조 단순화** - subcollection 최소화
2. **비즈니스 로직 분리** - 가능하면 클라이언트 측 로직 증가
3. **표준 타입 사용** - Timestamp 대신 ISO 문자열
4. **문서화** - Firebase 의존 코드에 `// FIREBASE-DEPENDENT` 주석 표시
