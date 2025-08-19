import { useState, useEffect } from 'react';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

const defaultBreakpoints: ResponsiveBreakpoints = {
  mobile: 640,   // sm
  tablet: 1024,  // lg
  desktop: 1280, // xl
};

export function useResponsive(customBreakpoints?: Partial<ResponsiveBreakpoints>) {
  const breakpoints = { ...defaultBreakpoints, ...customBreakpoints };
  
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function updateSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({ width, height });

      // Determine device type based on width
      if (width < breakpoints.mobile) {
        setDeviceType('mobile');
      } else if (width < breakpoints.tablet) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    }

    // Set initial size
    updateSize();

    // Add event listener
    window.addEventListener('resize', updateSize);

    // Cleanup
    return () => window.removeEventListener('resize', updateSize);
  }, [breakpoints.mobile, breakpoints.tablet]);

  return {
    deviceType,
    windowSize,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isMobileOrTablet: deviceType === 'mobile' || deviceType === 'tablet',
    isTabletOrDesktop: deviceType === 'tablet' || deviceType === 'desktop',
    breakpoints,
  };
}

// Utility functions for responsive design
export const getResponsiveValue = <T,>(
  mobile: T,
  tablet: T,
  desktop: T,
  deviceType: DeviceType
): T => {
  switch (deviceType) {
    case 'mobile':
      return mobile;
    case 'tablet':
      return tablet;
    case 'desktop':
      return desktop;
    default:
      return desktop;
  }
};

export const getResponsiveClasses = (
  deviceType: DeviceType,
  mobileClasses: string,
  tabletClasses: string,
  desktopClasses: string
): string => {
  return getResponsiveValue(mobileClasses, tabletClasses, desktopClasses, deviceType);
};
