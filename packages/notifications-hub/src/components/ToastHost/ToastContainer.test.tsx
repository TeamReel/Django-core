import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastContainer, ToastPosition } from './ToastContainer';

describe('ToastContainer', () => {
  describe('Positioning', () => {
    it('positions at top-right', () => {
      const { container } = render(
        <ToastContainer position="top-right">
          <div>Toast</div>
        </ToastContainer>
      );

      const toastContainer = container.querySelector('[data-position="top-right"]');
      expect(toastContainer).toHaveStyle({
        position: 'fixed',
        top: '16px',
        right: '16px',
      });
    });

    it('positions at top-left', () => {
      const { container } = render(
        <ToastContainer position="top-left">
          <div>Toast</div>
        </ToastContainer>
      );

      const toastContainer = container.querySelector('[data-position="top-left"]');
      expect(toastContainer).toHaveStyle({
        position: 'fixed',
        top: '16px',
        left: '16px',
      });
    });

    it('positions at top-center', () => {
      const { container } = render(
        <ToastContainer position="top-center">
          <div>Toast</div>
        </ToastContainer>
      );

      const toastContainer = container.querySelector('[data-position="top-center"]');
      expect(toastContainer).toHaveStyle({
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
      });
    });

    it('positions at bottom-right', () => {
      const { container } = render(
        <ToastContainer position="bottom-right">
          <div>Toast</div>
        </ToastContainer>
      );

      const toastContainer = container.querySelector('[data-position="bottom-right"]');
      expect(toastContainer).toHaveStyle({
        position: 'fixed',
        bottom: '16px',
        right: '16px',
      });
    });

    it('positions at bottom-left', () => {
      const { container } = render(
        <ToastContainer position="bottom-left">
          <div>Toast</div>
        </ToastContainer>
      );

      const toastContainer = container.querySelector('[data-position="bottom-left"]');
      expect(toastContainer).toHaveStyle({
        position: 'fixed',
        bottom: '16px',
        left: '16px',
      });
    });

    it('positions at bottom-center', () => {
      const { container } = render(
        <ToastContainer position="bottom-center">
          <div>Toast</div>
        </ToastContainer>
      );

      const toastContainer = container.querySelector('[data-position="bottom-center"]');
      expect(toastContainer).toHaveStyle({
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
      });
    });
  });

  describe('Stacking', () => {
    it('uses flexbox column for vertical stacking', () => {
      const { container } = render(
        <ToastContainer position="top-right">
          <div>Toast 1</div>
          <div>Toast 2</div>
          <div>Toast 3</div>
        </ToastContainer>
      );

      const toastContainer = container.querySelector('[data-position="top-right"]');
      expect(toastContainer).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
      });
    });

    it('renders multiple children', () => {
      const { getByText } = render(
        <ToastContainer position="top-right">
          <div>Toast 1</div>
          <div>Toast 2</div>
          <div>Toast 3</div>
        </ToastContainer>
      );

      expect(getByText('Toast 1')).toBeInTheDocument();
      expect(getByText('Toast 2')).toBeInTheDocument();
      expect(getByText('Toast 3')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has high z-index for visibility above content', () => {
      const { container } = render(
        <ToastContainer position="top-right">
          <div>Toast</div>
        </ToastContainer>
      );

      const toastContainer = container.querySelector('[data-position="top-right"]');
      expect(toastContainer).toHaveStyle({
        zIndex: 9999,
      });
    });

    it('has pointer-events: none on container for click-through', () => {
      const { container } = render(
        <ToastContainer position="top-right">
          <div>Toast</div>
        </ToastContainer>
      );

      const toastContainer = container.querySelector('[data-position="top-right"]');
      expect(toastContainer).toHaveStyle({
        pointerEvents: 'none',
      });
    });

    it('injects mobile responsive styles', () => {
      const { container } = render(
        <ToastContainer position="top-right">
          <div>Toast</div>
        </ToastContainer>
      );

      const styleTag = container.querySelector('style');
      expect(styleTag?.textContent).toContain('@media (max-width: 768px)');
      expect(styleTag?.textContent).toContain('left: 50%');
      expect(styleTag?.textContent).toContain('transform: translateX(-50%)');
    });
  });

  describe('Accessibility', () => {
    it('has aria-live="polite" for screen reader announcements', () => {
      const { container } = render(
        <ToastContainer position="top-right">
          <div>Toast</div>
        </ToastContainer>
      );

      const toastContainer = container.querySelector('[data-position="top-right"]');
      expect(toastContainer).toHaveAttribute('aria-live', 'polite');
    });

    it('has aria-atomic="false" for incremental announcements', () => {
      const { container } = render(
        <ToastContainer position="top-right">
          <div>Toast</div>
        </ToastContainer>
      );

      const toastContainer = container.querySelector('[data-position="top-right"]');
      expect(toastContainer).toHaveAttribute('aria-atomic', 'false');
    });
  });
});
