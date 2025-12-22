import React, { useRef, useEffect } from 'react';
import { Koi } from '../types';
import { KoiRenderer } from '../utils/koiRenderer';
import { getPhenotype, getDisplayColor, getSpineColor, GENE_COLOR_MAP, calculateSpotPhenotype } from '../utils/genetics';

interface SingleKoiCanvasProps {
    koi: Koi;
    width?: number;
    height?: number;
    showDetails?: boolean;
}

export const SingleKoiCanvas: React.FC<SingleKoiCanvasProps> = ({ koi, width = 300, height = 200, showDetails = true }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<KoiRenderer | null>(null);
    const animationRef = useRef<number | null>(null);
    const stateRef = useRef({
        x: width / 2,
        y: height / 2,
        vx: 0,
        vy: 0,
        targetX: width / 2,
        targetY: height / 2,
        nextTargetTime: 0,
        lastTime: 0,
        initialized: false
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Create new renderer for each mount
        const renderer = new KoiRenderer();
        rendererRef.current = renderer;

        // Calculate appropriate scale based on canvas size
        const scale = Math.min(width, height) / 300;
        renderer.setScale(scale, true); // Set scale immediately

        const padding = Math.max(20, Math.min(width, height) * 0.16);
        const swimSpeed = 65 * scale; // px/sec (상세보기에서는 조금 느리게)
        const turnSpeed = 0.8; // rad/sec (Reduced from 1.8 per user request)

        const getRandomTarget = () => {
            const minX = padding;
            const maxX = width - padding;
            const minY = padding;
            const maxY = height - padding;
            const rand = (min: number, max: number) => (max <= min ? (min + max) / 2 : min + Math.random() * (max - min));
            return { x: rand(minX, maxX), y: rand(minY, maxY) };
        };

        const normalizeAngle = (angle: number) => {
            let a = angle;
            while (a < -Math.PI) a += Math.PI * 2;
            while (a > Math.PI) a -= Math.PI * 2;
            return a;
        };

        // Initialize position at center with random initial target
        const state = stateRef.current;
        state.x = width / 2;
        state.y = height / 2;
        const initialTarget = getRandomTarget();
        state.targetX = initialTarget.x;
        state.targetY = initialTarget.y;
        const initialAngle = Math.random() * Math.PI * 2;
        state.vx = Math.cos(initialAngle) * swimSpeed;
        state.vy = Math.sin(initialAngle) * swimSpeed;
        state.lastTime = performance.now();
        state.nextTargetTime = performance.now() + 1500;
        state.initialized = false;

        // Calculate colors from genetics
        const phenotype = getPhenotype(koi.genetics.baseColorGenes);
        // Albino expression: Both alleles must be true (recessive)
        const albinoAlleles = koi.genetics.albinoAlleles || [false, false];
        const isAlbinoExpr = albinoAlleles[0] && albinoAlleles[1];
        const bodyColor = getDisplayColor(phenotype, koi.genetics.lightness, koi.genetics.saturation, isAlbinoExpr);
        const spineColor = getSpineColor(phenotype, koi.genetics.lightness, koi.genetics.saturation, isAlbinoExpr);
        const spotPhenotype = calculateSpotPhenotype(koi.genetics.spotPhenotypeGenes, koi);

        const colors = {
            outline: 'rgba(255, 255, 255, 0.15)',
            body: bodyColor,
            pattern: '#FF4500',
            spine: spineColor || '#000000',
            fin: bodyColor.replace(/hsla\((\d+),\s*([\.\d]+)%,\s*([\.\d]+)%,\s*1\)/, (match: string, h: string, s: string, l: string) => {
                const desaturatedS = Math.max(0, parseFloat(s) * 0.4);
                return `hsla(${h}, ${desaturatedS}%, ${l}%, 0.5)`;
            })
        };

        const spots = koi.genetics.spots.map(spot => ({
            ...spot,
            color: GENE_COLOR_MAP[spot.color]
        }));


        // Animation loop - koi swims freely in the mini pond
        const animate = () => {
            if (!rendererRef.current || !ctx) return;

            const now = performance.now();
            let dt = (now - state.lastTime) / 1000;
            state.lastTime = now;
            if (!Number.isFinite(dt) || dt <= 0) dt = 1 / 60;
            dt = Math.min(dt, 0.05); // 탭 전환 등으로 dt가 튀는 경우 완화

            // Pick a new random target periodically
            const toTargetDx = state.targetX - state.x;
            const toTargetDy = state.targetY - state.y;
            const distToTarget = Math.hypot(toTargetDx, toTargetDy);
            if (now > state.nextTargetTime || distToTarget < 30) {
                const nextTarget = getRandomTarget();
                state.targetX = nextTarget.x;
                state.targetY = nextTarget.y;
                state.nextTargetTime = now + 2200 + Math.random() * 2000;
            }

            // Steering (연못(GameEngine) 방식에 가깝게: 일정 속도 + 제한된 회전)
            const angleToTarget = Math.atan2(state.targetY - state.y, state.targetX - state.x);
            let currentAngle = Math.atan2(state.vy, state.vx);
            if (!Number.isFinite(currentAngle)) currentAngle = angleToTarget;
            const diff = normalizeAngle(angleToTarget - currentAngle);
            currentAngle += diff * turnSpeed * dt;
            state.vx = Math.cos(currentAngle) * swimSpeed;
            state.vy = Math.sin(currentAngle) * swimSpeed;

            // Update position
            state.x += state.vx * dt;
            state.y += state.vy * dt;

            // Bounce off walls gently
            if (state.x < padding) {
                state.x = padding;
                state.vx = Math.abs(state.vx);
                const nextTarget = getRandomTarget();
                state.targetX = nextTarget.x;
                state.targetY = nextTarget.y;
                state.nextTargetTime = now + 1000;
            }
            if (state.x > width - padding) {
                state.x = width - padding;
                state.vx = -Math.abs(state.vx);
                const nextTarget = getRandomTarget();
                state.targetX = nextTarget.x;
                state.targetY = nextTarget.y;
                state.nextTargetTime = now + 1000;
            }
            if (state.y < padding) {
                state.y = padding;
                state.vy = Math.abs(state.vy);
                const nextTarget = getRandomTarget();
                state.targetX = nextTarget.x;
                state.targetY = nextTarget.y;
                state.nextTargetTime = now + 1000;
            }
            if (state.y > height - padding) {
                state.y = height - padding;
                state.vy = -Math.abs(state.vy);
                const nextTarget = getRandomTarget();
                state.targetX = nextTarget.x;
                state.targetY = nextTarget.y;
                state.nextTargetTime = now + 1000;
            }

            // Create koi state for renderer (position is in absolute canvas pixels)
            const swimKoi = {
                ...koi,
                position: { x: state.x, y: state.y },
                velocity: { vx: state.vx, vy: state.vy }
            };

            // Update renderer with absolute position
            rendererRef.current.update(swimKoi, dt, true);

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 월드 좌표로 렌더링해서 코이가 캔버스(파란 박스) 안을 실제로 이동하도록 합니다.
            rendererRef.current.drawWorld(ctx, colors, spots, false, Date.now(), spotPhenotype, isAlbinoExpr);

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [koi, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            // Removed w-full h-full to prevent aspect ratio distortion
            className="block"
            style={{ width: `${width}px`, height: `${height}px` }}
        />
    );
};

