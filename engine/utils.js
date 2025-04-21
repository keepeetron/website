import { Vector } from './vector.js';

export function getDailySeed() {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
}

export function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
} 

export function getRandomPointInUnitCircle(rng = Math.random) {
    // Use square root method - generate random angle and radius
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng()); // Square root gives uniform distribution
    
    // Convert polar coordinates to cartesian
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    
    return new Vector(x, y);
}

export function angleLerp(start, end, t) {
    // Normalize angles to [-PI, PI] range
    let diff = end - start;
    
    // Wrap angle difference to [-PI, PI]
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    // Linear interpolation with wrapped difference
    return start + diff * t;
}

export function angleDiff(a, b) {
    let diff = a - b;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
}

export function isMobileDevice() {
    // Check if the device width is less than 800px (common mobile breakpoint)
    const isMobileWidth = window.innerWidth < 800;
    
    // Check for touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check user agent for mobile devices
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    return isMobileWidth || hasTouch || isMobileUserAgent;
}
