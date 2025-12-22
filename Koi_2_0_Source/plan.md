# 🚀 Zen Koi Garden 온라인화 구현 계획서

**버전**: 2.0 (백엔드/프론트엔드 분리)

---

## 📋 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **목표** | 웹/앱 호환 온라인 잉어 거래 시스템 구축 |
| **백엔드** | Firebase (Auth + Firestore + Cloud Functions) |
| **프론트엔드** | React + TypeScript + Capacitor |
| **거래 재화** | 광고 포인트 (AP) - 15초=200AP, 30초=500AP |
| **수수료** | 5% (구매자 부담) |

---

# 🔧 백엔드 작업

## BE-1: Firebase 프로젝트 설정

### BE-1.1: 초기 설정 ✅
- [x] Firebase 프로젝트 생성 (Firebase Console)
- [x] Web 앱 등록
- [x] Android 앱 등록 (`com.zenkoigarden.game`)
- [x] SHA-1 인증서 등록 (Google Sign-In용)
- [x] `google-services.json` 파일 추가 (`android/app/` 폴더)

### BE-1.2: 인증 설정 ✅
- [x] Authentication → Google 로그인 활성화
- [x] 승인된 도메인 추가

---

## BE-2: Firestore 데이터베이스 구조 ✅

```javascript
// 컬렉션 구조

// 1. 사용자 정보
users/{userId}
├── profile: { 
│     nickname: string,
│     createdAt: timestamp,
│     lastLogin: timestamp
│   }
├── gameData: {
│     money: number,      // ZP (인게임 재화)
│     food: number,
│     corn: number,
│     medicine: number,
│     theme: string,
│     pondCapacity: number
│   }
├── ap: number           // 광고 포인트
└── kois: [{             // 잉어 배열
      id: string,
      genes: [...],
      age: number,
      generation: number,
      ...
    }]

// 2. 세션 관리 (동시접속 방지)
sessions/{userId}: {
  deviceId: string,
  lastActive: timestamp,
  isOnline: boolean
}

// 3. 장터 - 경매 목록
marketplace/listings/{listingId}: {
  sellerId: string,
  sellerNickname: string,
  koiData: { ... },          // 잉어 전체 정보
  koiPreview: { ... },       // 미리보기용 요약 정보
  startPrice: number,        // 시작가 (AP)
  buyNowPrice: number,       // 즉시구매가 (AP)
  currentBid: number,        // 현재 최고 입찰가
  currentBidderId: string,   // 현재 최고 입찰자
  createdAt: timestamp,
  expiresAt: timestamp,      // 경매 종료 시간
  status: 'active' | 'sold' | 'expired' | 'cancelled'
}

// 4. 장터 - 입찰 내역
marketplace/listings/{listingId}/bids/{bidId}: {
  bidderId: string,
  bidderNickname: string,
  amount: number,
  timestamp: timestamp
}

// 5. 거래 내역 (감사 로그)
transactions/{transactionId}: {
  type: 'purchase' | 'bid_win' | 'ad_reward',
  userId: string,
  amount: number,
  fee: number,               // 수수료 (5%)
  listingId?: string,
  timestamp: timestamp
}
```

---

## BE-3: Firestore 보안 규칙 ✅

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 사용자 데이터: 본인만 읽기/쓰기
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 세션: 본인만 쓰기, 읽기는 서버만
    match /sessions/{userId} {
      allow write: if request.auth != null && request.auth.uid == userId;
      allow read: if false; // Cloud Functions만 접근
    }
    
    // 장터 목록: 인증된 사용자 읽기 가능
    match /marketplace/listings/{listingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.sellerId;
      allow update, delete: if false; // Cloud Functions만 처리
    }
    
    // 입찰: 인증된 사용자만 생성 가능
    match /marketplace/listings/{listingId}/bids/{bidId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
                    && request.resource.data.bidderId == request.auth.uid;
    }
  }
}
```

---

## BE-4: Cloud Functions

### BE-4.1: 설치 및 설정
```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

### BE-4.2: 필요한 함수들

| 함수명 | 트리거 | 역할 |
|--------|--------|------|
| `onSessionCreate` | Firestore onCreate | 기존 세션 강제 종료 |
| `onBidCreate` | Firestore onCreate | 입찰 검증, AP 임시 차감 |
| `processExpiredAuctions` | Scheduled (1분마다) | 만료 경매 처리 |
| `onBuyNow` | HTTPS Callable | 즉시 구매 처리 |
| `rewardAdPoints` | HTTPS Callable | 광고 시청 AP 지급 (검증) |

### BE-4.3: Cloud Functions 코드

```typescript
// functions/src/index.ts

// 1. 동시접속 방지 - 새 세션 시 기존 세션 종료
export const onSessionCreate = functions.firestore
  .document('sessions/{userId}')
  .onCreate(async (snap, context) => {
    // 이전 세션 강제 종료 로직
  });

// 2. 경매 종료 처리 (1분마다 실행)
export const processExpiredAuctions = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    // 만료된 경매 찾기
    // 낙찰자에게 잉어 전달
    // 판매자에게 AP 지급 (수수료 제외)
    // 유찰 시 잉어 반환
  });

// 3. 즉시 구매
export const onBuyNow = functions.https.onCall(async (data, context) => {
  const { listingId } = data;
  const buyerId = context.auth?.uid;
  
  // 1. 구매자 AP 확인
  // 2. 수수료 계산 (5%)
  // 3. AP 차감
  // 4. 잉어 소유권 이전
  // 5. 판매자 AP 지급
  // 6. 거래 기록 저장
});

// 4. 광고 보상 (서버 검증)
export const rewardAdPoints = functions.https.onCall(async (data, context) => {
  const { adType, verificationToken } = data;
  const userId = context.auth?.uid;
  
  // 1. 광고 시청 검증 (토큰 확인)
  // 2. AP 지급 (15초: 200, 30초: 500)
  // 3. 중복 지급 방지
});
```

---

## BE-5: 백엔드 산출물 요약

| 파일/설정 | 설명 |
|-----------|------|
| Firebase Console 설정 | 프로젝트, 앱 등록, Auth 설정 |
| `firestore.rules` | 보안 규칙 |
| `firestore.indexes.json` | 인덱스 설정 |
| `functions/src/index.ts` | Cloud Functions |
| `functions/src/auction.ts` | 경매 처리 로직 |
| `functions/src/ads.ts` | 광고 검증 로직 |

---

# 🎨 프론트엔드 작업

## FE-1: Firebase SDK 연동

### FE-1.1: 패키지 설치
```bash
npm install firebase
```

### FE-1.2: Firebase 초기화
```typescript
// services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  // ...
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();
```

---

## FE-2: 인증 시스템 UI

### FE-2.1: 로그인 모달
```
┌─────────────────────────────────┐
│      🎏 Zen Koi Garden          │
│                                 │
│  ┌─────────────────────────┐    │
│  │  🎮 게스트로 시작        │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  🔐 Google로 로그인      │    │
│  └─────────────────────────┘    │
│                                 │
│  ⚠️ 게스트 데이터는 온라인으로   │
│     이전할 수 없습니다           │
└─────────────────────────────────┘
```

### FE-2.2: 파일 목록
| 파일 | 역할 |
|------|------|
| `services/auth.ts` | 로그인/로그아웃 로직 |
| `components/AuthModal.tsx` | 로그인 UI |
| `hooks/useAuth.ts` | 인증 상태 훅 |
| `contexts/AuthContext.tsx` | 인증 컨텍스트 |

---

## FE-3: 데이터 동기화

### FE-3.1: 온라인 모드 로직
```typescript
// services/sync.ts
export async function syncGameData(userId: string, localData: GameState) {
  // 1. 세션 생성 (동시접속 체크)
  // 2. 서버 데이터 불러오기
  // 3. 실시간 리스너 설정
}

export function setupRealtimeSync(userId: string, onUpdate: (data) => void) {
  return onSnapshot(doc(db, 'users', userId), (doc) => {
    onUpdate(doc.data());
  });
}
```

### FE-3.2: 동시접속 차단 UI
```
┌─────────────────────────────────┐
│  ⚠️ 다른 기기에서 접속 감지됨    │
│                                 │
│  다른 기기의 연결이 끊어집니다.   │
│  계속하시겠습니까?               │
│                                 │
│  [취소]          [계속하기]      │
└─────────────────────────────────┘
```

### FE-3.3: 파일 목록
| 파일 | 역할 |
|------|------|
| `services/sync.ts` | 동기화 로직 |
| `services/session.ts` | 세션 관리 |
| `hooks/useOnlineStatus.ts` | 온라인 상태 |
| `components/SessionConflictModal.tsx` | 충돌 알림 |

---

## FE-4: 광고 포인트 시스템

### FE-4.1: AP 표시 UI
```
┌────────────────────────────────────────┐
│  💰 ZP: 15,000    ⭐ AP: 2,500         │
│                   [+ 광고 보기]         │
└────────────────────────────────────────┘
```

### FE-4.2: 광고 시청 모달
```
┌─────────────────────────────────┐
│      ⭐ 광고 포인트 획득         │
│                                 │
│  ┌─────────────────────────┐    │
│  │  📺 15초 광고 → 200 AP   │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  📺 30초 광고 → 500 AP   │    │
│  └─────────────────────────┘    │
│                                 │
│  현재 AP: 2,500                 │
└─────────────────────────────────┘
```

### FE-4.3: 파일 목록
| 파일 | 역할 |
|------|------|
| `services/ads.ts` | 광고 SDK 연동 |
| `services/points.ts` | AP 관리 |
| `components/AdRewardModal.tsx` | 광고 UI |
| `components/APDisplay.tsx` | AP 잔액 표시 |

---

## FE-5: 장터 시스템

### FE-5.1: 장터 메인 페이지
```
┌─────────────────────────────────────────────┐
│  🏪 장터                    ⭐ AP: 2,500    │
├─────────────────────────────────────────────┤
│  [전체] [색상▼] [가격▼] [종료임박]           │
├─────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │  🐟     │  │  🐟     │  │  🐟     │     │
│  │ 금색    │  │ 알비노  │  │ 코하쿠  │     │
│  │ 500 AP  │  │ 1,200AP │  │ 800 AP  │     │
│  │ 3일 남음│  │ 1일 남음│  │ 즉구가능│     │
│  └─────────┘  └─────────┘  └─────────┘     │
│                                            │
│  [+ 내 잉어 등록하기]                        │
└─────────────────────────────────────────────┘
```

### FE-5.2: 경매 상세
```
┌─────────────────────────────────────────────┐
│  🐟 금색 코이 - 3세대                        │
├─────────────────────────────────────────────┤
│                                             │
│        ┌───────────────────┐                │
│        │                   │                │
│        │    [잉어 미리보기]  │                │
│        │                   │                │
│        └───────────────────┘                │
│                                             │
│  판매자: KoiMaster123                       │
│  시작가: 300 AP                             │
│  현재가: 450 AP (3명 입찰)                  │
│  즉시구매: 800 AP                           │
│  남은시간: 2일 15시간                       │
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │  💰 입찰하기  │  │  ⚡ 즉시구매 │        │
│  │   (500 AP)   │  │  (840 AP)   │        │
│  └──────────────┘  └──────────────┘        │
│                    * 수수료 5% 포함          │
└─────────────────────────────────────────────┘
```

### FE-5.3: 파일 목록
| 파일 | 역할 |
|------|------|
| `components/MarketplaceModal.tsx` | 장터 메인 |
| `components/ListingCard.tsx` | 경매 카드 |
| `components/ListingDetailModal.tsx` | 상세 보기 |
| `components/CreateListingModal.tsx` | 등록 UI |
| `components/BidModal.tsx` | 입찰 UI |
| `services/marketplace.ts` | 장터 API |

---

## FE-6: 기존 코드 수정

| 파일 | 수정 내용 |
|------|----------|
| `App.tsx` | 온라인 모드 분기, AuthContext 추가 |
| `types.ts` | 온라인 관련 타입 추가 |
| `components/ControlBar.tsx` | AP 표시, 장터 버튼 추가 |
| `utils/serializer.ts` | 서버 데이터 변환 로직 |

---

# ⏱️ 일정 요약

## 백엔드 (BE)
| 단계 | 기간 | 병렬 가능 |
|------|------|----------|
| BE-1: Firebase 설정 | 1일 | - |
| BE-2: DB 구조 설계 | 1일 | FE-1 |
| BE-3: 보안 규칙 | 1일 | FE-2 |
| BE-4: Cloud Functions | 3-5일 | FE-3, FE-4 |
| **BE 총합** | **약 1주** | |

## 프론트엔드 (FE)
| 단계 | 기간 | 의존성 |
|------|------|--------|
| FE-1: Firebase 연동 | 0.5일 | BE-1 완료 후 |
| FE-2: 인증 UI | 1-2일 | FE-1 |
| FE-3: 동기화 | 2-3일 | BE-3 |
| FE-4: 광고 포인트 | 2일 | BE-4 (ads 함수) |
| FE-5: 장터 UI | 3-5일 | BE-4 (auction 함수) |
| FE-6: 기존 코드 수정 | 1일 | 전체 |
| **FE 총합** | **약 2-3주** | |

## 전체 일정
```
주차 1: BE-1~3 + FE-1~2
주차 2: BE-4 + FE-3
주차 3: BE-4 완료 + FE-4
주차 4: FE-5
주차 5: FE-5 완료 + FE-6 + 테스트
────────────────────────
총합: 약 5주
```

---

# 🎯 다음 단계

**백엔드 시작:**
1. Firebase Console에서 프로젝트 생성
2. 설정값 (apiKey, projectId 등) 제공

**프론트엔드 시작:**
1. Firebase SDK 설치
2. 인증 UI 개발

> 어느 쪽부터 시작하시겠어요?
