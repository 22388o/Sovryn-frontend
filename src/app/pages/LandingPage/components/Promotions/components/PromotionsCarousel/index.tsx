import React from 'react';
import Carousel from 'react-multi-carousel';
import 'react-multi-carousel/lib/styles.css';
import { CustomLeftArrow } from './CustomLeftArrow';
import { CustomRightArrow } from './CustomRightArrow';
import { CustomDot } from './CustomDot';

const responsive = {
  desktop: {
    breakpoint: { max: 4800, min: 1200 },
    items: 4,
    slidesToSlide: 2,
  },
  tablet: {
    breakpoint: { max: 1199, min: 464 },
    items: 2,
    slidesToSlide: 2,
  },
  mobile: {
    breakpoint: { max: 464, min: 0 },
    items: 1,
    slidesToSlide: 1,
  },
};

export const PromotionsCarousel: React.FC = ({ children }) => {
  return (
    <div className="tw-max-w-90 tw-mx-auto tw-relative">
      <Carousel
        arrows
        responsive={responsive}
        draggable
        focusOnSelect={false}
        infinite
        minimumTouchDrag={80}
        renderDotsOutside
        customLeftArrow={<CustomLeftArrow />}
        customRightArrow={<CustomRightArrow />}
        customDot={<CustomDot />}
        showDots
        swipeable
      >
        {children}
      </Carousel>
    </div>
  );
};
