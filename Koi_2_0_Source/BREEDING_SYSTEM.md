# 교배 시스템 정리 (코드 기준)

이 문서는 **현재 코드 구현**을 기준으로 교배(번식) 시스템을 정리합니다.  
설계 의도/기획을 추정하지 않고, 실제 동작을 만드는 코드(함수/상수/데이터 구조)를 중심으로 설명합니다.

---

## 1) 핵심 데이터 구조

### Koi(코이) 주요 필드
- `types.ts`의 `Koi`
  - `growthStage`: `'fry' | 'juvenile' | 'adult'`
  - `stamina?: number` (0~100, 교배 조건에서 사용)
  - `sickTimestamp?: number | null` (질병 플래그; 교배 조건에는 직접 사용되지 않지만 성장/회복에 영향)
  - `genetics: KoiGenetics`

### KoiGenetics(유전 정보) 주요 필드
- `types.ts`의 `KoiGenetics`
  - `baseColorGenes: GeneType[]` (기본 체색 유전자, 배열 길이 제한 없음)
  - `lightness: number` (0~100, 표시용 명도 오프셋)
  - `spots: Spot[]` (점 데이터: 위치/크기/색/모양)
  - `isTransparent: boolean` (현재 교배에서는 항상 `false`로 고정)
  - `spotPhenotypeGenes?: SpotPhenotypeGenes` (10-유전자 점 표현형 시스템)
  - `generationalData?: GenerationalData` (격세유전용 “세대 기억” 데이터, 현재 발현은 비활성)

---

## 2) 플레이어 관점: 교배 UI/흐름

- 메인 연못 화면에서 코이를 클릭하면 `App.tsx`의 `breedingSelection`에 선택이 쌓입니다.
- 선택한 코이가 1마리 이상이면 하단에 선택 인디케이터/버튼 UI가 표시됩니다.
- **정확히 2마리 선택 시** `교배 ({부모 예상가치 합} ZP)` 버튼이 나타나고, 조건이 충족되면 활성화됩니다.
  - 관련 코드: `App.tsx`의 `canBreed`, `handleMultiParentBreed`, `handleBreedKois`

---

## 3) 교배 조건(검사 순서 기준)

`App.tsx`의 `handleBreedKois(parents)` 기준:

1. 부모 선택: `parents.length === 2`
2. 성장 단계: 부모 2마리 모두 `GrowthStage.ADULT`
3. 연못 수용량: `koiList.length < 30` (최대 30마리)
4. 체력: 부모 2마리 모두 `(stamina ?? 0) >= 30`
5. 질병: 부모 2마리 모두 `sickTimestamp == null`
6. 젠 포인트: `zenPoints >= (calculateKoiValue(부모1) + calculateKoiValue(부모2))`

참고:
- 버튼 활성/비활성은 `canBreed`에서 일부 조건(성체/체력/질병/ZP)만 선검사하고, **연못 수용량(30)** 같은 조건은 `handleBreedKois` 실행 시 최종 차단됩니다.

---

## 4) 교배 비용/패널티

`handleBreedKois`에서 교배가 성립하면 즉시 적용됩니다.

- 젠 포인트: `calculateKoiValue(부모1) + calculateKoiValue(부모2)` 만큼 차감
- 체력 소모: 부모 각각 `30` (`consumeStamina([parent1.id, parent2.id], 30)`)
- 수질 감소: `reduceWaterQuality(4)`

---

## 5) 자손 생성 규칙(기본 스펙)

`App.tsx`의 `handleBreedKois`에서 자손을 생성합니다.

### 5-1. 자손 마릿수
- `offspringCount = Math.floor(Math.random() * 2) + 1`
  - 결과: **1~2마리(균등 확률)**

### 5-2. 각 자손의 초기 상태
각 자손은 다음 기본값으로 생성됩니다.

- `id`: `crypto.randomUUID()`
- `name`: `"코이"` (고정)
- `description`: `"{부모1.name}와 {부모2.name}의 자손"`
- `genetics`: `breedKoi(parent1.genetics, parent2.genetics).genetics`
- `position`: `{ x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 }` (10~90 범위)
- `velocity`: `{ vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2 }` (대략 -0.1~0.1)
- `size`: `4`
- `age`: `0`
- `growthStage`: `GrowthStage.FRY`
- `timesFed`: `0`
- `foodTargetId`: `null`
- `feedCooldownUntil`: `null`
- `stamina`: `100`

참고:
- 코드상 `koiNameCounter`를 증가시키지만, 현재 자손 이름 생성에는 반영되지 않습니다(자손 이름은 전부 `"코이"`).

---

## 6) 유전 로직: `breedKoi(genetics1, genetics2)`

핵심 구현: `utils/genetics.ts`의 `breedKoi`

`breedKoi`는 `{ genetics, mutations }`를 반환하지만, 일반 교배(UI)에서는 `mutations` 값을 사용하지 않습니다.

### 6-1. spotPhenotypeGenes(10-유전자) 처리(0번 단계)

자식 `spotPhenotypeGenes` 결정:
- 부모 둘 다 `spotPhenotypeGenes` 존재 → `breedSpotPhenotypeGenes(parent1, parent2)`
- 한쪽만 존재 → 그쪽 값을 그대로 사용
- 둘 다 없음 → `createRandomSpotPhenotypeGenes()`로 랜덤 생성

### 6-2. baseColorGenes(기본 체색 유전자) 교배(1번 단계)

1) 배우자(gamete) 생성  
`getGamete(genes)`:
- 전달 개수: `Math.max(1, Math.floor(genes.length / 2))`
- `genes`를 셔플한 뒤 앞에서부터 `gameteSize`만큼 선택
- **유전자 확장(중복 추가)**: `GENE_EXPANSION_CHANCE = 0` 이므로 현재 비활성

2) 돌연변이(대체/특수)  
현재 설정:
- `BASE_COLOR_MUTATION_CHANCE = 0` (기본 체색 돌연변이 비활성)
- `SPECIAL_MUTATION_CHANCE = 0` (특수 색상 돌연변이 비활성)

3) 자식 유전자 합치기/정리
- `childGenes = [...gamete1, ...gamete2]`
- **유전자 삭제(프루닝)**: 길이가 `> 6`이면 **2% 확률**(`GENE_DELETION_CHANCE = 0.02`)로 `pop()` 1개 제거
- 안전장치: `childGenes.length === 0`이면 `CREAM`을 1개 넣음

### 6-3. lightness(명도) 교배(2번 단계)

- `avgLightness = (p1.lightness + p2.lightness) / 2`
- **20% 확률**(`LIGHTNESS_MUTATION_CHANCE = 0.2`)로 `±5` 범위 변이
  - 구현: `(Math.random() - 0.5) * 2 * 5`
- 결과는 `0~100`으로 clamp

### 6-4. spots(점 배열) 교배(3번 단계)

이 단계는 `Spot[]`(레거시 점 데이터)를 직접 교배합니다.

#### A) 목표 점 개수(`targetSpotsCount`) 결정
1) 기본 점 개수(`baseCount`) 결정(부모 점 개수 기준)
- `maxSpots = max(parent1.spots.length, parent2.spots.length)`
- `minSpots = min(parent1.spots.length, parent2.spots.length)`
- 블렌딩(평균) 50% / 유지(최대값) 50%
  - 블렌딩 값: `blendedCount = floor((maxSpots + minSpots) / 2)`
  - `baseCount = (50%) maxSpots` 또는 `(50%) blendedCount`

2) 추가/삭제/유지 이벤트로 최종 목표치 결정
- 기준: `n = baseCount`
- 가중치(비율):
  - 추가: `e^(-n/10)`
  - 삭제: `1 - e^(-n/10)` (n=0일 때 0)
  - 유지: `e^(-n/20)`
- 위 3개 가중치를 합이 100%가 되도록 정규화한 뒤, 이벤트에 따라
  - 추가면 `targetSpotsCount = n + 1`
  - 삭제면 `targetSpotsCount = max(0, n - 1)`
  - 유지면 `targetSpotsCount = n`

#### B) 상속(inherit) 처리
- 부모 점들을 합쳐 셔플한 뒤 일부를 상속합니다.
- 상속 가능한 최대치 제한:
  - `maxParentSpots = max(parent1.spots.length, parent2.spots.length)`
  - `inheritanceCount = min(targetSpotsCount, maxParentSpots)`

상속된 각 spot은 다음 규칙으로 “재배치/변형”됩니다.
- `x`, `y`: 새로 랜덤(0~100)
- `size`: 부모 spot 크기에서 **±4** 정도 변이 후 **20~120으로 clamp**
  - `SIZE_MUTATION_AMOUNT = 4`
  - 구현: `spot.size + (Math.random() - 0.5) * 8`
- `color`: **5% 확률**로 랜덤 색으로 변이 (`SPOT_COLOR_MUTATION_CHANCE = 0.05`)
- `shape`: 기본은 부모 shape 유지, 없으면 `circle/hexagon/polygon` 중 랜덤

#### C) 부족한 spot 채우기(“새로 생김”)
상속 후 `childSpots.length < targetSpotsCount`이면 `createNewRandomSpot()`으로 추가 생성합니다.

- 색상 선택:
  - 부모 색상 풀(`parentColors`)이 있고, `Math.random() > 0.05`이면(=95%) 부모 색상 중 랜덤 1개 사용
  - 그 외(=5% 또는 부모가 색이 없음) 완전 랜덤
- `createNewRandomSpot(preferredColor?)` 규칙:
  - `shape`: `SpotShape` 중 **OVAL_V 제외**한 값에서 랜덤 선택 (즉 `OVAL_H`는 포함)
  - `size`: **20~240** 범위 랜덤
  - `x`, `y`: 0~100 범위 랜덤

중요 포인트:
- 상속 spot은 **20~120**, “새로 생김” spot은 **20~240** 범위로 유지됩니다.

### 6-5. 투명도(isTransparent) 교배(4번 단계)

- 현재 자식 `isTransparent`는 **항상 `false`**로 고정됩니다.

### 6-6. 세대 기억(generationalData) 생성(5번 단계)

자식 `generationalData`는 다음 조건에서 생성됩니다.
- 부모 중 하나라도 `spotPhenotypeGenes`가 있을 때

저장 내용:
- 부모의 `spotPhenotypeGenes`로 `calculateSpotPhenotype()`를 계산한 뒤,
  - `opacityBase`, `colorHue`, `colorSaturation`, `sizeBase`, `edgeBlur`, `density`만
  - `grandparent1`, `grandparent2`에 저장합니다.
- `generation`은 `max(parentGen1, parentGen2) + 1`

참고:
- “격세유전(atavism)” 발현 로직은 `calculateSpotPhenotype`에서 **비활성**이므로, 현재는 저장만 하고 사용하지 않습니다.

---

## 7) 기본 체색 발현: `getPhenotype(baseColorGenes)`

핵심 구현: `utils/genetics.ts`의 `getPhenotype`

### 7-1. 발현 규칙(현재 코드)
- 유전자 배열에서 **같은 GeneType이 2개 이상** 등장해야 후보가 됩니다.
- 후보가 하나도 없으면 **무조건 `CREAM`**
- 후보가 여러 개면 `DOMINANCE_ORDER`로 우선순위를 결정합니다.
  - 우선순위: `BLACK > RED > ORANGE > YELLOW > CREAM > WHITE`

실제 체감 포인트:
- 기본적으로 `baseColorGenes`가 2개로 운영되는 경우가 많아,
  - **두 유전자가 같은 색이면 그 색이 발현**
  - **서로 다르면 발현 후보가 없어 `CREAM` 발현**

### 7-2. 표시 색상(렌더링)
- `getDisplayColor(phenotype, lightness, isTransparent)`가 `GeneType`을 HSLA로 변환합니다.
  - `WHITE`는 lightness 유전자를 무시하고 고정 룩을 사용합니다.
  - 그 외 색은 기본 색(`GENE_COLOR_MAP`)의 HSL에 `lightness - 50` 오프셋을 더해 표시합니다.

---

## 8) 10-유전자 점 표현형 시스템(spotPhenotypeGenes)

### 8-1. 유전자 목록/의미
`types.ts`의 `SpotPhenotypeGenes`
- OP: 기본 투명도(Opacity Base)
- OV: 투명도 변이(Opacity Variance)
- CH: 색조(Color Hue)
- CS: 채도(Color Saturation)
- SB: 크기 기본(Size Base)
- SV: 크기 변이(Size Variance)
- EB: 가장자리 흐림(Edge Blur)
- DN: 밀도(Density)
- PX/PY: 위치 편향(Position Bias X/Y)

각 유전자는 `GeneAlleles`:
- `allele1`, `allele2`: `value: 0~1`, `origin: maternal|paternal`
- `dominanceType`: `complete|incomplete|recessive|codominance`

### 8-2. 유전자별 우성 타입(현재 설정)
`utils/genetics.ts`의 `GENE_DOMINANCE_CONFIG`
- OP: `INCOMPLETE`
- OV: `RECESSIVE`
- CH: `CODOMINANCE`
- CS: `COMPLETE`
- SB: `INCOMPLETE`
- SV: `RECESSIVE`
- EB: `COMPLETE`
- DN: `INCOMPLETE`
- PX/PY: `CODOMINANCE`

### 8-3. 교배: `breedSpotPhenotypeGenes(parent1, parent2)`

핵심 구현: `utils/genetics.ts`의 `breedSpotPhenotypeGenes`

1) 감수분열(배우자 생성): `performMeiosis(parentGenes)`
- 각 유전자마다 50% 확률로 `allele1` 또는 `allele2`를 선택합니다.
- 연관 유전(linkage)이 설정된 경우, 이미 선택된 “짝 유전자”가 있으면
  - 연관 확률로 같은 `origin`의 allele을 선택합니다.

연관 그룹(`LINKAGE_GROUPS`):
- OP–OV: 0.7
- CH–CS: 0.8
- SB–SV: 0.6
- PX–PY: 0.9

2) 교차(crossover): `applyCrossover(gamete)`
- 각 연관 그룹마다 **15% 확률**(`CROSSOVER_RATE = 0.15`)로 “origin 라벨”을 swap 합니다.
- 참고: 이후 자손 생성 과정에서 `origin`을 다시 `maternal/paternal`로 고정하므로, 현재 구현에서는 교차의 영향이 제한적입니다(값 자체는 swap 하지 않음).

3) 근친 계수 계산: `calculateInbreedingCoefficient(genes1, genes2)`
- 각 유전자에 대해 `expressGene()` 결과의 차이를 이용해 유사도를 계산하고 평균냅니다.
- 범위: `0.0 ~ 1.0`

4) 유전자 결합(자손 생성)
- `allele1 = gamete1[geneId]`, `allele2 = gamete2[geneId]`
- 변이(mutation) 적용 → 드리프트(drift) 적용 → origin 라벨 정리

5) 변이(mutation): `applyMutation(allele, config)`
`MUTATION_CONFIGS` (type/rate/magnitude):
- OP: point / 0.02 / 0.15
- OV: point / 0.03 / 0.20
- CH: point / 0.05 / 0.25
- CS: point / 0.03 / 0.15
- SB: point / 0.02 / 0.10
- SV: point / 0.04 / 0.20
- EB: point / 0.02 / 0.15
- DN: deletion / 0.01 / 0.30
- PX: point / 0.03 / 0.15
- PY: point / 0.03 / 0.15

변이 타입별 동작:
- `point`: `±magnitude` 범위로 더함
- `deletion`: `value *= (1 - magnitude)`
- `duplication`: `value *= (1 + magnitude)`
- `inversion`: `value = 1 - value`

6) 드리프트(drift): `applyDrift(allele)`
- `DRIFT_RATE = 0.005`
- `±0.005` 범위로 값이 미세하게 이동

7) 근친 페널티: `applyInbreedingPenalty(geneAlleles, coefficient)`
- `coefficient > 0.7`이면 `penalty = (coefficient - 0.7) * 2`
- **확률 `penalty`**로 `allele1.value`를 `(1 - penalty * 0.3)`만큼 감소

---

## 9) 점 표현형 계산: `calculateSpotPhenotype(spotPhenotypeGenes, koi?)`

핵심 구현: `utils/genetics.ts`의 `calculateSpotPhenotype`

이 함수는 10-유전자(`SpotPhenotypeGenes`)로부터 “발현값(SpotPhenotype)”을 계산합니다.  
또한 `koi`가 주어지면 성장 단계/체력(건강)에 따라 환경 보정을 적용합니다.

### 9-1. Step 1: 유전자 발현값 산출(각인+우성타입)
- 각 유전자는 `expressGene(geneAlleles, geneId)`로 0~1 값을 얻습니다.
- `expressGene`는 `dominanceType`에 따라 두 allele 값을 조합합니다.
  - COMPLETE: `max(val1, val2)`
  - INCOMPLETE: `(val1 + val2) / 2`
  - RECESSIVE: `min(val1, val2)`
  - CODOMINANCE: `val1*0.5 + val2*0.5 + |val1-val2|*0.2`
- 게놈 각인(Genomic Imprinting):
  - `IMPRINTING_CONFIG`에 따라 maternal/paternal allele에 bias를 곱합니다.

참고(결정론):
- QTL 노이즈(`applyQTLNoise`)는 “동일 유전자형이면 동일 표현형”을 위해 현재 **비활성**입니다.

### 9-2. Step 2: 유전자 상호작용 네트워크 적용
- `applyGeneInteractions`는 `GENE_INTERACTIONS`에 따라 시너지/길항을 반영합니다.
  - `synergy`: 두 값이 모두 `> 0.6`이면 `result *= (1 + strength)`
  - `antagonism`: 상대가 `> 0.7`이면 `result *= (1 - strength)`

### 9-3. Step 3: 숨은 열성 활성화(결정론)
- 조건: **3개 이상** 유전자가 동시에 `allele1.value < 0.35` 그리고 `allele2.value < 0.35`
  - `HIDDEN_ACTIVATION_THRESHOLD = 3`
- 효과(고정 배율):
  - OP, CS: `* 1.5`
  - SB: `* 0.5`

### 9-4. Step 4~7: 상위성/조절/다면발현/다인성 혼합

상위성(Epistasis) 규칙:
- EB > 0.8 → CS 억제(`* 0.3`)
- DN < 0.6 → SV 무시(`0`)
- OP < 0.3 → CH 증폭(`* 1.5`)
- SB >= 0.9 → OV 제한(`* 0.5`)

조절 유전자(Modifier) 적용:
- CS는 DN에 의해 50%~100%로 조절: `csModifier = 0.5 + DN * 0.5`
- EB는 SB에 의해 0.7x~1.3x 증폭: `ebAmplifier = 1 + (SB - 0.5) * 0.6`

다인성 혼합(최종 값):
- `finalOpacity = OP*0.70 + effectiveCS*0.20 + DN*0.10`
- `finalSize = SB*0.60 + OP*0.20 + amplifiedEB*0.20`
- `colorVibrancy = effectiveCS*0.5 * amplifiedEB*0.3 * OP*0.2`

### 9-5. Step 8: 환경 보정(성장단계/체력)
`koi`가 주어졌을 때만 적용됩니다.
- `ageFactor`:
  - adult: 1.0
  - juvenile: 0.85
  - fry: 0.7
- `healthFactor = (stamina ?? 100) / 100`
- `envModifier = ageFactor * healthFactor`
- 현재 구현에서 환경 보정은 `opacityBase`에만 곱해집니다.

### 9-6. Step 9~12: 역치 형질/격세유전/확률적 발현

역치 형질(Threshold Traits):
- `checkThresholdTraits(afterInteractions)`로 조건을 만족하면 활성화됩니다(랜덤 없음).
- 적용 효과(`applyThresholdEffects`):
  - `golden_sheen`: 채도 `*1.4`, hue를 `0.12`로 고정
  - `ghost_pattern`: opacity `*0.5`(최소 0.1), edgeBlur `*1.5`
  - `mega_spot`: sizeBase `*1.3`, sizeVariance `*0.3`
  - `scattered_dots`: sizeBase `*0.6`(최소 0.1), density `*1.3`
  - `symmetry_master`: positionBiasX/Y를 `0.5`로 고정, sizeVariance `*0.5`

격세유전(Atavism):
- 무작위 선택으로 결과가 흔들리는 것을 막기 위해 현재 **비활성**입니다.

확률적 발현(Stochastic Expression):
- 스팟 “깜빡임(flickering)”을 막기 위해 현재 **비활성**입니다.

---

## 10) 성장(치어→준성체→성체)과 교배 가능 시점

관련 구현: `hooks/useKoiPond.ts`

- `POINTS_TO_JUVENILE = 10`
- `POINTS_TO_ADULT = 20`
- 먹이를 먹으면 `timesFed += feedAmount`로 성장 포인트가 누적됩니다.
  - 치어(fry): `timesFed >= 10`이면 준성체(juvenile)로 성장하며 `timesFed`가 0으로 리셋
  - 준성체(juvenile): `timesFed >= 20`이면 성체(adult)로 성장하며 `timesFed`가 0으로 리셋
- 성체만 교배 가능하므로, **치어/준성체는 교배 불가**입니다.

질병 영향:
- `sickTimestamp`가 있으면 먹이를 먹어도 성장/회복이 진행되지 않도록 막는 로직이 존재합니다(교배 조건 자체는 `sickTimestamp`를 검사하지 않음).

---

## 11) 랜덤 요소/확률 요약(현재 코드)

### 11-1. 교배(자손 생성)
- 자손 수: 1~2마리(균등)

### 11-2. 기본 체색 유전자
- 배우자 선택: 각 부모의 유전자에서 “대략 절반”을 랜덤 선택(최소 1개)
- 유전자 삭제: (자식 유전자 길이 > 6)일 때 2% 확률로 1개 제거
- 체색 돌연변이/특수 돌연변이/유전자 확장: 현재 0% (비활성)

### 11-3. 명도(lightness)
- 20% 확률로 ±5 변이

### 11-4. spots(점 배열)
- 기본 점 개수: 블렌딩 50% / 유지(최대값) 50%
- 점 개수 이벤트: `추가=e^(-n/10)`, `삭제=1-e^(-n/10)`, `유지=e^(-n/20)` 가중치 정규화 후 1회 적용
- 상속 점 색 변이: 5%
- 새로 생성되는 점 색상:
  - 부모 색상 풀에서 선택: 95%
  - 완전 랜덤: 5%
- 새로 생성되는 점 크기: 20~240
- 상속 점 크기: 20~120(클램프)

### 11-5. spotPhenotypeGenes(10-유전자)
- 교차: 연관 그룹별 15%
- 드리프트: 각 allele에 ±0.005
- 변이: 유전자별 rate/magnitude(MUTATION_CONFIGS)
- 근친 페널티: 근친 계수 > 0.7일 때 확률적으로 allele1 감소

---

## 12) 관련 코드 위치(빠른 탐색)

- 교배 버튼/조건/자손 생성: `App.tsx` (`handleBreedKois`, `canBreed`)
- 유전(기본 체색/명도/점/세대기억): `utils/genetics.ts` (`breedKoi`, `getGamete`, `getPhenotype`)
- 점 표현형(10-유전자) 생성/교배/발현: `utils/genetics.ts` (`createRandomSpotPhenotypeGenes`, `breedSpotPhenotypeGenes`, `calculateSpotPhenotype`)
- 성장/성장단계 전환: `hooks/useKoiPond.ts` (`POINTS_TO_JUVENILE`, `POINTS_TO_ADULT`)
- 교배 시뮬레이션(참고): `reproduce_breeding.ts`
