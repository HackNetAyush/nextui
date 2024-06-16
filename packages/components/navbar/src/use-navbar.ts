// use-navbar.tsx

import type {NavbarVariantProps, SlotsToClasses, NavbarSlots} from "@nextui-org/theme";

import {
  HTMLNextUIProps,
  mapPropsVariants,
  PropGetter,
  useProviderContext,
} from "@nextui-org/system";
import {navbar} from "@nextui-org/theme";
import {useDOMRef} from "@nextui-org/react-utils";
import {clsx, dataAttr, objectToDeps} from "@nextui-org/shared-utils";
import {ReactRef} from "@nextui-org/react-utils";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {mergeProps, useResizeObserver} from "@react-aria/utils";
import {useScrollPosition} from "@nextui-org/use-scroll-position";
import {useControlledState} from "@react-stately/utils";
import {HTMLMotionProps} from "framer-motion";

interface Props extends HTMLNextUIProps<"nav"> {
  ref?: ReactRef<HTMLElement | null>;
  parentRef?: React.RefObject<HTMLElement>;
  height?: number | string;
  isMenuOpen?: boolean;
  isMenuDefaultOpen?: boolean;
  shouldHideOnScroll?: boolean;
  disableScrollHandler?: boolean;
  motionProps?: HTMLMotionProps<"nav">;
  onMenuOpenChange?: (isOpen: boolean) => void;
  onScrollPositionChange?: (scrollPosition: number) => void;
  classNames?: SlotsToClasses<NavbarSlots>;
}

export type UseNavbarProps = Props & NavbarVariantProps;

export function useNavbar(originalProps: UseNavbarProps) {
  const globalContext = useProviderContext();

  const [props, variantProps] = mapPropsVariants(originalProps, navbar.variantKeys);

  const {
    ref,
    as,
    parentRef,
    height = "4rem",
    shouldHideOnScroll = false,
    disableScrollHandler = false,
    onScrollPositionChange,
    isMenuOpen: isMenuOpenProp,
    isMenuDefaultOpen,
    onMenuOpenChange = () => {},
    motionProps,
    className,
    classNames,
    ...otherProps
  } = props;

  const Component = as || "nav";
  const disableAnimation =
    originalProps.disableAnimation ?? globalContext?.disableAnimation ?? false;

  const domRef = useDOMRef(ref);

  const prevWidth = useRef(0);
  const navHeight = useRef(0);
  const lastScrollY = useRef(0); // Track the last scroll position

  const [isHidden, setIsHidden] = useState(false);

  const handleMenuOpenChange = useCallback(
    (isOpen: boolean | undefined) => {
      onMenuOpenChange(isOpen || false);
    },
    [onMenuOpenChange],
  );

  const [isMenuOpen, setIsMenuOpen] = useControlledState<boolean>(
    isMenuOpenProp,
    isMenuDefaultOpen ?? false,
    handleMenuOpenChange,
  );

  const updateWidth = () => {
    if (domRef.current) {
      const width = domRef.current.offsetWidth;

      if (width !== prevWidth.current) {
        prevWidth.current = width;
      }
    }
  };

  useResizeObserver({
    ref: domRef,
    onResize: () => {
      const currentWidth = domRef.current?.offsetWidth;

      if (currentWidth !== prevWidth.current) {
        updateWidth();
        setIsMenuOpen(false);
      }
    },
  });

  useEffect(() => {
    updateWidth();
    navHeight.current = domRef.current?.offsetHeight || 0;
  }, []);

  const slots = useMemo(
    () =>
      navbar({
        ...variantProps,
        disableAnimation,
        hideOnScroll: shouldHideOnScroll,
      }),
    [objectToDeps(variantProps), disableAnimation, shouldHideOnScroll],
  );

  const baseStyles = clsx(classNames?.base, className);

  useScrollPosition({
    elementRef: parentRef,
    isEnabled: shouldHideOnScroll || !disableScrollHandler,
    callback: ({prevPos, currPos}) => {
      onScrollPositionChange?.(currPos.y);

      if (shouldHideOnScroll) {
        const currentScrollY = currPos.y;

        if (currentScrollY > lastScrollY.current && currentScrollY > navHeight.current) {
          setIsHidden(true); // Hide navbar on scroll down
        } else if (currentScrollY < lastScrollY.current) {
          setIsHidden(false); // Show navbar on scroll up
        }

        lastScrollY.current = currentScrollY;
      }
    },
  });

  const getBaseProps: PropGetter = (props = {}) => ({
    ...mergeProps(otherProps, props),
    "data-hidden": dataAttr(isHidden),
    "data-menu-open": dataAttr(isMenuOpen),
    ref: domRef,
    className: slots.base({class: clsx(baseStyles, props?.className)}),
    style: {
      "--navbar-height": height,
      ...otherProps?.style,
      ...props?.style,
    },
  });

  const getWrapperProps: PropGetter = (props = {}) => ({
    ...props,
    "data-menu-open": dataAttr(isMenuOpen),
    className: slots.wrapper({class: clsx(classNames?.wrapper, props?.className)}),
  });

  return {
    Component,
    slots,
    domRef,
    height,
    isHidden,
    disableAnimation,
    shouldHideOnScroll,
    isMenuOpen,
    classNames,
    setIsMenuOpen,
    motionProps,
    getBaseProps,
    getWrapperProps,
  };
}

export type UseNavbarReturn = ReturnType<typeof useNavbar>;
