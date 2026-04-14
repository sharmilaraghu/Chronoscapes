import type { ReactNode } from 'react';

interface NewspaperLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  showCenter?: boolean;
}

export default function NewspaperLayout({ left, center, right, showCenter = false }: NewspaperLayoutProps) {
  return (
    <div className="newspaper-layout-root">
      {/* Left — map */}
      <div className="newspaper-col newspaper-col--left">
        {left}
      </div>

      {/* Center — radio: slides in when showCenter=true */}
      <div className={`newspaper-col-center-wrapper${showCenter ? ' newspaper-col-center-wrapper--visible' : ''}`}>
        <div className="column-rule" />
        <div className="newspaper-col newspaper-col--center">
          {center}
        </div>
      </div>

      <div className="column-rule" />

      {/* Right — dispatches */}
      <div className="newspaper-col newspaper-col--right">
        {right}
      </div>
    </div>
  );
}
