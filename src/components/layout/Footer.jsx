import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-divider py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-vara-base">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-vara-xs text-muted-sage-gray">
            &copy; {new Date().getFullYear()} Vara Wellness. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="text-vara-xs text-muted-sage-gray hover:text-evergreen-teal transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-vara-xs text-muted-sage-gray hover:text-evergreen-teal transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
