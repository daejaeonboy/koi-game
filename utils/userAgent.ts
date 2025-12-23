export const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isInAppBrowser = (): boolean => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /KAKAOTALK|NAVER|Line|FBAN|FBAV|Instagram|DaumApps/i.test(ua);
};
