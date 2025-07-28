import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Custom404() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Background with "This is Fine" meme */}
      <div 
        className="absolute inset-0 opacity-10 dark:opacity-5"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect fill="%23ff6b35" width="800" height="600"/><g fill="%23000" opacity="0.1"><rect x="50" y="400" width="100" height="200" rx="10"/><rect x="200" y="350" width="150" height="250" rx="10"/><rect x="400" y="300" width="120" height="300" rx="10"/><rect x="570" y="380" width="130" height="220" rx="10"/></g><path d="M100 400 Q200 350 300 380 T500 350 Q600 320 700 360" stroke="%23ff4500" stroke-width="8" fill="none" opacity="0.3"/><path d="M150 450 Q250 400 350 430 T550 400 Q650 370 750 410" stroke="%23ff4500" stroke-width="6" fill="none" opacity="0.2"/><circle cx="400" cy="200" r="80" fill="%23ffa500" opacity="0.2"/><path d="M350 180 Q400 150 450 180 Q400 220 350 180" fill="%23ff4500" opacity="0.3"/></svg>')`,
          backgroundRepeat: 'repeat',
          backgroundSize: '400px 300px'
        }}
      />
      
      {/* Fire effect animation */}
      <div className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none">
        <div className="relative w-full h-full">
          <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-orange-500/20 via-red-500/10 to-transparent animate-pulse" />
          <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-red-600/20 via-orange-500/10 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>

      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
        {/* Dog emoji sitting in chair with coffee */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="text-8xl animate-bounce" style={{ animationDuration: '3s' }}>
            🐕
          </div>
          <div className="text-5xl animate-bounce" style={{ animationDuration: '3s', animationDelay: '0.5s' }}>
            ☕
          </div>
        </div>
        
        {/* Fire emojis */}
        <div className="flex justify-center space-x-4 mb-8">
          <span className="text-4xl fire-dance">🔥</span>
          <span className="text-5xl fire-dance" style={{ animationDelay: '0.3s' }}>🔥</span>
          <span className="text-4xl fire-dance" style={{ animationDelay: '0.6s' }}>🔥</span>
        </div>

        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
          404
        </h1>
        
        <p className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          This is Fine
        </p>
        
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Страница, которую вы ищете, похоже, сгорела. Но все в порядке, мы справимся!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button size="lg" className="group">
              <span className="mr-2">🏠</span>
              На главную
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => window.history.back()}
            className="group"
          >
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
            Назад
          </Button>
        </div>

        {/* Small "everything is fine" text */}
        <p className="mt-12 text-sm text-gray-500 dark:text-gray-500 italic">
          * Все под контролем, просто небольшой пожар
        </p>
      </div>

      {/* Additional decorative fire elements */}
      <div className="absolute top-10 left-10 text-2xl opacity-50 fire-flicker">🔥</div>
      <div className="absolute top-20 right-20 text-3xl opacity-40 fire-flicker" style={{ animationDelay: '1s' }}>🔥</div>
      <div className="absolute bottom-20 left-20 text-2xl opacity-30 fire-flicker" style={{ animationDelay: '0.5s' }}>🔥</div>
      <div className="absolute bottom-10 right-10 text-4xl opacity-50 fire-flicker" style={{ animationDelay: '1.5s' }}>🔥</div>
      
      {/* Smoke effect */}
      <div className="absolute bottom-0 left-0 right-0 h-96 pointer-events-none smoke" />

      <style jsx>{`
        @keyframes flicker {
          0%, 100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          25% {
            opacity: 0.8;
            transform: scale(1.05) translateY(-5px);
          }
          50% {
            opacity: 0.9;
            transform: scale(0.95) translateY(-3px);
          }
          75% {
            opacity: 0.7;
            transform: scale(1.02) translateY(-8px);
          }
        }

        @keyframes fire-dance {
          0% {
            transform: translateX(0) translateY(0) rotate(0deg);
          }
          25% {
            transform: translateX(-5px) translateY(-10px) rotate(-5deg);
          }
          50% {
            transform: translateX(5px) translateY(-15px) rotate(5deg);
          }
          75% {
            transform: translateX(-3px) translateY(-8px) rotate(-3deg);
          }
          100% {
            transform: translateX(0) translateY(0) rotate(0deg);
          }
        }

        .fire-flicker {
          animation: flicker 1.5s ease-in-out infinite;
        }

        .fire-dance {
          animation: fire-dance 3s ease-in-out infinite;
        }

        .smoke {
          background: radial-gradient(
            ellipse at center bottom,
            rgba(128, 128, 128, 0.1) 0%,
            transparent 70%
          );
          animation: smoke-rise 4s ease-out infinite;
        }

        @keyframes smoke-rise {
          0% {
            opacity: 0;
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(1.5);
          }
        }
      `}</style>
    </div>
  );
}