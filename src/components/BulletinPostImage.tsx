
import React from 'react';

interface BulletinPostImageProps {
  src: string;
  alt: string;
  className?: string;
}

const BulletinPostImage = ({ src, alt, className = "" }: BulletinPostImageProps) => {
  return (
    <img
      src={src}
      alt={alt}
      className={`object-fill ${className}`}
    />
  );
};

export default BulletinPostImage;
