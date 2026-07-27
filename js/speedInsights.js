/**
 * Vercel Speed Insights initialization for NexusAI
 * This script injects the Speed Insights tracking for static HTML pages
 */
(function() {
  // Initialize Speed Insights tracking queue
  window.si = window.si || function () { 
    (window.siq = window.siq || []).push(arguments); 
  };

  // Load Speed Insights script asynchronously
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/speed-insights/script.js';
  
  // Insert script at the end of body
  if (document.body) {
    document.body.appendChild(script);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.appendChild(script);
    });
  }
})();
