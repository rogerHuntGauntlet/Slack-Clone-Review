import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      const chatContainer = document.querySelector('.overflow-y-auto');
      if (chatContainer && chatContainer.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    const chatContainer = document.querySelector('.overflow-y-auto');
    if (chatContainer) {
      chatContainer.addEventListener('scroll', toggleVisibility);
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', toggleVisibility);
      }
    };
  }, []);

  const scrollToTop = () => {
    const chatContainer = document.querySelector('.overflow-y-auto');
    if (chatContainer) {
      chatContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-8 bg-pink-500 text-white p-3 rounded-full shadow-lg hover:bg-pink-600 transition-all duration-300 z-50"
        >
          <ChevronUp size={24} />
        </button>
      )}
    </>
  );
};

export default ScrollToTopButton;
