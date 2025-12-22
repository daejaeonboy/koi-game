# 복잡한 교배 시스템 - 변경 사항 카탈로그

## 개요
사용자가 많은 교배를 통해 원하는 형질을 얻을 수 있으면서도, 결과를 **예측하기 어렵게** 만드는 7가지 새 메커니즘을 구현했습니다.

---

## 1. 게놈 각인 (Genomic Imprinting)

같은 유전자라도 **모계/부계** 중 어느 쪽에서 받았는지에 따라 발현이 달라집니다.

```typescript
const IMPRINTING_CONFIG: Record<keyof SpotPhenotypeGenes, { maternalBias: number; paternalBias: number }> = {
    OP: { maternalBias: 1.0, paternalBias: 1.0 },   // 중립
    OV: { maternalBias: 1.2, paternalBias: 0.8 },   // 모계 우세
    CH: { maternalBias: 0.9, paternalBias: 1.1 },   // 부계 우세
    SB: { maternalBias: 1.1, paternalBias: 0.9 },   // 모계 우세
    EB: { maternalBias: 0.8, paternalBias: 1.2 },   // 부계 우세
    // ...
};
```

| 유전자 | 모계 편향 | 부계 편향 | 효과 |
|--------|-----------|-----------|------|
| OV | 1.2x | 0.8x | 투명도 변이는 어미 영향 ↑ |
| CH | 0.9x | 1.1x | 색상 색조는 아비 영향 ↑ |
| SB | 1.1x | 0.9x | 크기는 어미 영향 ↑ |
| EB | 0.8x | 1.2x | 흐림은 아비 영향 ↑ |

---

## 2. 역치 형질 (Threshold Traits)

여러 유전자가 특정 조건을 **동시에** 충족하면 특수 효과가 발동됩니다.

```typescript
const THRESHOLD_TRAITS: ThresholdTrait[] = [
    {
        id: 'golden_sheen',
        name: '황금빛 광채',
        requirements: { CH: 0.75, CS: 0.7, OP: 0.6 },
        description: '황금빛으로 빛나는 점 패턴'
    },
    // ...
];
```

| 형질 | 조건 | 효과 |
|------|------|------|
| 황금빛 광채 | CH ≥ 0.75, CS ≥ 0.7, OP ≥ 0.6 | 채도 1.4x, 금색 색조 |
| 유령 패턴 | OP ≤ 0.3, EB ≥ 0.75, DN ≤ 0.4 | 투명도 50%, 흐림 1.5x |
| 거대 점 | SB ≥ 0.85, SV ≤ 0.25, DN ≥ 0.75 | 크기 1.3x, 변이 최소화 |
| 흩어진 점 | SB ≤ 0.25, SV ≥ 0.8, DN ≥ 0.9 | 작은 점, 밀도 증가 |
| 대칭의 달인 | PX ≈ 0.5, PY ≈ 0.5, SV ≤ 0.2 | 완벽한 대칭 배치 |

---

## 3. 유전자 상호작용 네트워크 (Gene Interaction Network)

유전자들이 서로 **시너지** 또는 **억제** 관계를 가집니다.

```typescript
const GENE_INTERACTIONS: Record<keyof SpotPhenotypeGenes, GeneInteraction[]> = {
    OP: [
        { partner: 'CS', type: 'synergy', strength: 0.2 },   // 투명도 + 채도 시너지
        { partner: 'SB', type: 'synergy', strength: 0.15 }
    ],
    CS: [
        { partner: 'EB', type: 'antagonism', strength: 0.25 } // 채도 - 흐림 억제
    ],
    // ...
};
```

| 관계 | 유전자 쌍 | 타입 | 강도 |
|------|-----------|------|------|
| OP ↔ CS | 투명도 ↔ 채도 | 시너지 | +20% |
| CS ↔ EB | 채도 ↔ 흐림 | 억제 | -25% |
| SB ↔ DN | 크기 ↔ 밀도 | 억제 | -20% |
| PX ↔ PY | X편향 ↔ Y편향 | 시너지 | +30% |

---

## 4. QTL 노이즈 (Quantitative Trait Loci Noise)

모든 유전자 발현에 **가우시안 분포 노이즈**가 적용됩니다.

```typescript
const QTL_NOISE_CONFIG = {
    baseNoise: 0.08,          // ±8% 기본 노이즈
    interactionNoise: 0.12,   // ±12% 상호작용 노이즈
    environmentalNoise: 0.05, // ±5% 환경 노이즈
};

const gaussianRandom = (): number => {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
};
```

→ **같은 부모에서도 매번 약간씩 다른 자손이 태어남**

---

## 5. 확률적 발현 (Stochastic Expression)

최종 표현형에 **추가 변동** (±5%)이 적용됩니다.

```typescript
const STOCHASTIC_VARIANCE = 0.05;

const applyStochasticExpression = (phenotype: SpotPhenotype): SpotPhenotype => {
    const result = { ...phenotype };
    for (const key of numericKeys) {
        const variance = (Math.random() - 0.5) * 2 * STOCHASTIC_VARIANCE;
        result[key] = Math.max(0, Math.min(1, result[key] + variance));
    }
    return result;
};
```

→ **동일한 유전자형도 매번 미세하게 다르게 표현**

---

## 6. 숨은 열성 활성화 (Hidden Recessive Activation)

3개 이상의 유전자가 **열성 호모접합** 상태일 때 극단적 변화 발생:

```typescript
const HIDDEN_ACTIVATION_THRESHOLD = 3;

const checkHiddenRecessiveActivation = (genes: SpotPhenotypeGenes): boolean => {
    let recessiveCount = 0;
    for (const geneId of geneIds) {
        const gene = genes[geneId];
        if (gene.allele1.value < 0.35 && gene.allele2.value < 0.35) {
            recessiveCount++;
        }
    }
    return recessiveCount >= HIDDEN_ACTIVATION_THRESHOLD;
};
```

| 조건 | 효과 |
|------|------|
| 3+ 열성 호모접합 | 일부 형질 1.3x~1.7x 증폭 |
| | 일부 형질 0.4x~0.7x 억제 |

→ **근친 교배 시 예상치 못한 극단적 형질 출현 가능**

---

## 7. 격세유전 (Atavism)

**8% 확률**로 조부모 세대의 형질이 자손에게 나타납니다.

```typescript
const ATAVISM_CHANCE = 0.08;

interface GenerationalData {
    generation: number;
    ancestorTraits?: {
        grandparent1?: Partial<SpotPhenotype>;
        grandparent2?: Partial<SpotPhenotype>;
    };
}
```

→ **부모에게 없던 조부모 형질이 갑자기 발현 가능**

---

## 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `types.ts` | `HiddenModifier`, `AlleleExtended`, `GenerationalData`, `ThresholdTrait`, `GeneInteraction`, `activeTraits` 추가 |
| `genetics.ts` | 7가지 복잡성 메커니즘, 헬퍼 함수, `expressGene()`, `calculateSpotPhenotype()`, `breedKoi()` 수정 |

---

## 새로 추가된 타입

```typescript
// 역치 형질 정의
interface ThresholdTrait {
    id: string;
    name: string;
    requirements: Partial<Record<keyof SpotPhenotypeGenes, number>>;
    description: string;
}

// 유전자 상호작용
type GeneInteractionType = 'synergy' | 'antagonism' | 'neutral';

interface GeneInteraction {
    partner: keyof SpotPhenotypeGenes;
    type: GeneInteractionType;
    strength: number;
}

// 세대 기억 (격세유전용)
interface GenerationalData {
    generation: number;
    ancestorTraits?: {
        grandparent1?: Partial<SpotPhenotype>;
        grandparent2?: Partial<SpotPhenotype>;
    };
}
```

---

## 변경된 핵심 함수

### expressGene (수정)
```typescript
// 기존: 단순 우성 계산
export const expressGene = (geneAlleles: GeneAlleles): number

// 수정 후: 게놈 각인 + QTL 노이즈 적용
export const expressGene = (geneAlleles: GeneAlleles, geneId?: keyof SpotPhenotypeGenes): number
```

### calculateSpotPhenotype (수정)
```typescript
// 기존: 6단계 처리
// Step 1: 유전자 발현
// Step 2: 상위성
// Step 3: 조절 유전자
// Step 4: 다면발현
// Step 5: 다인성 유전
// Step 6: 환경 조절

// 수정 후: 12단계 처리
// Step 1: 게놈 각인 + QTL 노이즈로 발현
// Step 2: 상호작용 네트워크 적용
// Step 3: 숨은 열성 활성화 체크
// Step 4-8: 기존 로직
// Step 9: 기본 표현형 생성
// Step 10: 역치 형질 체크/적용
// Step 11: 격세유전 적용
// Step 12: 확률적 발현 적용
```

### breedKoi (수정)
```typescript
// 기존 반환
return {
    genetics: {
        baseColorGenes, spots, lightness, isTransparent,
        spotPhenotypeGenes
    },
    mutations
};

// 수정 후: generationalData 추가
return {
    genetics: {
        baseColorGenes, spots, lightness, isTransparent,
        spotPhenotypeGenes,
        generationalData  // 부모 표현형을 조부모 형질로 저장
    },
    mutations
};
```

---

*문서 작성일: 2025-12-14*

---

## 2025-12-18: 코이 상세보기(돋보기) 유영 개선

상세 정보창의 파란색 미리보기 박스에서 코이가 **연못 화면처럼 실제로 이동**하며 유영하도록 렌더링/초기화 흐름을 정리했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `components/SingleKoiCanvas.tsx` | `drawWorld()` 기반 월드 좌표 렌더링, 이동을 px/frame → px/sec(시간 기반)으로 변경해 속도/회전 불안정 완화, 등쪽(Spine) 색을 `getSpineColor()`로 통일 |
| `utils/koiRenderer.ts` | `update()`에서 1번 세그먼트를 머리 각도에 정렬해 초기 회전 시 목 꺾임 완화, 세그먼트 간 최대 굽힘 각도 제한(30도), `initSegmentsStraight()`의 머리/몸통 배치 및 스케일 동기화 수정 |

---

## 2025-12-18: 잉어 장터 UI 개선

판매 등록 직후 장터 목록이 즉시 갱신되도록 하고, 매물 카드/상세 미리보기의 표현을 개선했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `services/marketplace.ts` | 판매 등록 시 `createdAt`을 클라이언트 타임스탬프로 저장해 장터를 닫았다 켜지 않아도 목록이 바로 반영되도록 조정 |
| `App.tsx` | 판매 등록 성공 시 장터 목록 강제 갱신 트리거(`refreshKey`) 증가 |
| `components/MarketplaceModal.tsx` | `refreshKey` 변경 시 리스너 재구독으로 장터 목록 1회 갱신 + 최신순으로 정렬/상단 스크롤로 방금 등록한 매물이 보이도록 처리 |
| `components/ListingCard.tsx` | 원형 미리보기의 검은 점(간이 눈) 제거 |
| `components/ListingDetailModal.tsx` | 매물 상세 미리보기를 돋보기 메뉴와 동일한 `SingleKoiCanvas` + 파란 박스 스타일로 통일 |

---

## 2025-12-18: 저장/백업 탭 제거 + 계정 자동 저장 안정화

저장/불러오기/백업/복구 UI 탭을 제거하고, 로그인 상태에서는 게임 진행이 **계정(클라우드)에 자동 저장**되도록 동기화 흐름을 안정화했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `components/SaveLoadModal.tsx` | 저장/불러오기/백업/복구 탭 제거, `설정/새 게임`만 유지, 자동 저장 안내 문구 추가 |
| `App.tsx` | 클라우드 로드 완료 전 저장 방지(`isCloudSyncReady`), 저장 데이터에 `medicineCount` 포함, 로드 시 기본값 처리, 메뉴 툴팁/안내 문구 수정 |

---

## 2025-12-18: 게임 메뉴 로그아웃 버튼 추가

게임 메뉴의 `설정` 탭에 로그인 상태에서만 보이는 **로그아웃 버튼**을 추가했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `components/SaveLoadModal.tsx` | `설정` 탭 하단에 로그아웃 버튼 추가(로그인 상태에서만 표시), 클릭 시 로그아웃 후 메뉴 닫기 |

---

## 2025-12-18: 로그아웃/재로그인 데이터 분리 + 닉네임 설정

로그아웃/재로그인 시 **이전 진행 데이터(게스트/다른 계정)가 섞이지 않도록** 로컬 저장을 초기화하고 새로 시작하도록 개선했습니다. 또한 설정 메뉴에서 **닉네임을 저장/변경**할 수 있게 하고, 장터(판매/입찰)에서 닉네임이 적용되도록 연결했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `services/localSave.ts` | 로컬 진행 데이터 저장 키 상수화 + 초기화 유틸(`clearLocalGameSaves`, 레거시/버전 키 패턴 포함) 추가, 인증 전환 중 자동 저장이 다시 써서 “데이터 부활”하는 문제를 막기 위한 저장 억제 플래그(`suppressLocalGameSave`) 추가 |
| `components/AuthModal.tsx` | 로그인 성공 직후 로컬 진행 데이터 초기화 + 새로고침(게스트 데이터 인계 방지), 전환 중 로컬 자동 저장 억제 적용 |
| `components/SaveLoadModal.tsx` | 로그아웃 시 로컬 진행 데이터 초기화 + 새로고침, 전환 중 로컬 자동 저장 억제 적용(멀티탭 포함), 설정 탭에 닉네임 입력/저장 UI 추가 |
| `services/profile.ts` | Firestore 사용자 프로필 닉네임 보장/생성(`ensureUserProfileNickname`) + 닉네임 저장(`updateUserNickname`) 추가 |
| `App.tsx` | 클라우드 로드 성공 시에만 자동 저장 활성화(`isCloudSyncReady`), 닉네임을 장터 판매/입찰/설정 메뉴에 연결, 세션 충돌 모달의 “종료”가 실제 로그아웃이 되도록 수정, 다른 탭에서 로그아웃 시 이 탭도 강제 초기화되도록 `storage` 이벤트 처리 추가 |
| `components/ListingDetailModal.tsx` | 입찰 시 하드코딩된 `User` 대신 현재 닉네임을 사용 |

---

## 2025-12-18: 로그아웃 후 화면 상태 즉시 초기화

로그아웃 직후에도 화면에 **계정 진행 상태(연못/코이/포인트 등)가 남아 보이는 현상**을 막기 위해, 새로고침에만 의존하지 않고 **React 상태를 즉시 초기화**하도록 로그아웃 경로를 보강했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `App.tsx` | 로그아웃/새 게임 공통 초기화 함수(`resetGameToInitialState`)로 상태를 리셋하도록 정리, 세션 충돌 모달의 종료(로그아웃)도 동일 초기화 로직 사용 |
| `components/SaveLoadModal.tsx` | 로그아웃 성공 시 `onReset()`을 호출해 화면 상태를 즉시 초기화(리로드 실패 시에도 초기화가 남도록) |

---

## 2025-12-18: Functions 배포(Predeploy/Lint) 안정화

Firebase 배포 시 Functions predeploy 단계에서 `CRLF` 줄바꿈 때문에 ESLint가 실패하거나, Windows 환경에서 predeploy 명령 실행이 불안정한 문제를 완화했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `functions/.eslintrc.js` | `linebreak-style` 규칙을 비활성화하여(윈도우 CRLF 허용) 배포 단계에서 줄바꿈으로 실패하지 않도록 조정 |
| `firebase.json` | Functions `predeploy` 명령을 `$RESOURCE_DIR` 대신 `functions` 경로로 고정해 Windows에서 실행 안정성 개선 |

---

## 2025-12-18: 연못 현황 코이 이름 변경 + 로그인 새 게임 시작 제한

`연못 현황`에서 코이 이름을 직접 변경할 수 있게 하고, 로그인 상태에서 `새 게임 시작`이 잠깐 초기화되었다가 **기존 계정 데이터로 되돌아오던 문제(클라우드 로드)**를 서버 검증 기반 초기화로 해결했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `components/PondInfoModal.tsx` | 코이 리스트에서 이름 변경(인라인 편집/저장/취소) UI 추가 |
| `functions/src/index.ts` | `resetGameData` Callable 추가: 판매중 매물(Active listing) 존재 시 차단, 하루 3회 제한(서버 UTC 날짜 기준) 체크 후 계정 `gameData` 초기화 |
| `components/SaveLoadModal.tsx` | `새 게임 시작`을 비동기 처리(검증 중 버튼 비활성/표시), 로그아웃 후에는 새 게임 로직과 분리된 초기화 콜백 실행 |
| `App.tsx` | 로그인 상태 새 게임 시작 시 `resetGameData` 호출 → 성공 시 로컬/화면 초기화 + 리로드 + 다른 탭 초기화 브로드캐스트, 실패 시 경고 후 유지(판매중/횟수 제한), 대기 중인 클라우드 저장 타이머 정리로 “되돌아옴” 재발 방지 |

---

## 2025-12-18: 장터 판매 등록 undefined 필드 오류 수정

장터 판매 등록 시 Firestore가 `undefined` 필드를 허용하지 않아(`koiData.sickTimestamp` 등) 등록이 실패하던 문제를 수정했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `services/marketplace.ts` | `createListing()`에서 코이 데이터를 Firestore 호환 형태로 정리(중첩된 `undefined` 제거) 후 `addDoc` 호출 |

---

## 2025-12-18: 온라인(배포/앱/세션/장터) 안정화

웹/앱 환경과 Firebase(Hosting/Functions/Rules) 사이에서 **경로/리전/캐시 불일치**로 발생하던 문제들을 정리하고, 장터를 **경매/즉시 구매** 구조로 통일할 수 있는 기반을 추가했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `firebase.json` | SPA 라우트(`/` 포함)에서 `index.html`이 기본 캐시(`max-age=3600`)로 남아 구버전 번들이 계속 로드될 수 있어, `/**`에 `no-cache`를 적용(단, 해시된 `assets/**`는 장기 캐시 `immutable` 유지) |
| `public/sw.js` | (기존 유지) SW 등록/캐시 사용 구조 확인: 캐시 갱신이 느린 문제는 Hosting 헤더로 해결 방향 |
| `services/firebase.ts` | Cloud Functions 리전을 `asia-northeast1`로 고정하여 Callable Functions 호출 실패(기본 us-central1) 문제 해결 |
| `services/auth.ts` | 앱(Capacitor)에서 `@capacitor-firebase/authentication` 기반 Google 로그인 → Firebase JS SDK(`signInWithCredential`)로 브릿지하여 WebView에서도 정상 로그인 가능하게 구성 |
| `capacitor.config.ts` | `FirebaseAuthentication` 플러그인 설정(google provider) 추가 |
| `services/session.ts` / `functions/src/index.ts` | `/sessions` 문서 읽기 차단 유지 + Cloud Function이 `users/{uid}.activeDeviceId`를 갱신, 클라이언트는 `users`를 구독해 동시 로그인 감지 |
| `firestore.rules` / `firestore.indexes.json` | 장터 컬렉션을 `marketplace/listings/items` 경로로 통일하고(경매/즉구), 읽기/생성/입찰 규칙 및 필요한 인덱스 구조로 정리 |
| `services/marketplace.ts` / `components/*Marketplace*` | 장터 데이터를 경매 필드(`startPrice`, `currentBid`, `buyNowPrice`) 기준으로 표시/정렬/입찰/즉구 호출 구조로 변경 |
| `functions/src/index.ts` | `onBuyNow`, `processExpiredAuctions`, `rewardAdPoints`, `onCancelListing` 등에서 필드 누락 시에도 동작하도록 기본값 처리 및 `arrayUnion` 기반 갱신으로 안정화 |

---

## 2025-12-18: 교배 시스템 문서화

교배(번식) 시스템의 **실제 코드 동작**(조건/비용/자손 스펙/유전 로직/확률/성장 연계)을 하나의 문서로 정리했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `BREEDING_SYSTEM.md` | 교배 시스템 전체 정리 문서 추가 |

---

## 2025-12-18: 교배 시스템 확률/비용/제한 조정

교배 시 점(Spot) 개수 변화가 **추가/삭제 확률 곡선**을 따르도록 조정하고, 자손 수를 1~2마리로 줄였습니다. 또한 교배 비용을 부모의 예상 가치(판매가) 합으로 변경하고, 병든 코이는 교배할 수 없도록 제한했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `utils/genetics.ts` | 점 개수 결정 로직을 블렌딩 50%/유지 50% + `e^(-n/10)` 기반 추가/삭제/유지(정규화)로 변경, 상속 spot 크기 제한을 20~240으로 확장 |
| `App.tsx` | 자손 수 1~2로 변경, 교배 비용을 `calculateKoiValue(부모1)+calculateKoiValue(부모2)`로 변경, 질병(`sickTimestamp`) 시 교배 불가 처리 및 UI/조건 반영 |
| `BREEDING_SYSTEM.md` | 변경된 교배 규칙/확률/비용/조건으로 문서 내용 갱신 |

---

## 2025-12-18: 교배 상속 점 크기 조정

교배로 상속되는 점(Spot)의 크기 클램프를 20~120으로 조정했습니다. (새로 생성되는 점은 기존대로 20~240)

| 파일 | 변경 내용 |
|------|----------|
| `utils/genetics.ts` | 상속 spot `size` 클램프를 20~120으로 변경 |
| `BREEDING_SYSTEM.md` | 상속/새로 생성 점 크기 범위 설명 업데이트 |

---

## 2025-12-18: 장터(AP) 표시/입찰 UX 개선

장터에서 입찰 시 **보유 AP 부족한데도 버튼이 활성화**되거나, 입찰 직후 **현재가/보유 AP 표시가 늦게 반영**되어 혼란스러운 문제를 개선했습니다.

| 파일 | 변경 내용 |
|------|----------|
| `services/points.ts` | 사용자 문서(`users/{uid}`)를 구독해 AP 잔액을 실시간으로 반영하는 `listenToAPBalance` 추가 |
| `App.tsx` | 로그인 상태에서 AP 잔액을 `getDoc` 단발 조회 대신 실시간 구독으로 유지(구매/입찰/광고 보상 등 변동 즉시 반영) |
| `services/marketplace.ts` | 특정 매물 문서를 구독하는 `listenToListing` 추가(상세 모달에서 현재가 즉시 반영 용도) |
| `components/ListingDetailModal.tsx` | 입찰 버튼 비활성 조건에 보유 AP(수수료 포함) 체크 추가, 입찰 후 매물 문서를 구독해 현재가/입찰자 정보가 갱신되면 즉시 화면에 반영되도록 개선 |
