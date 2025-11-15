// src/components/fuelRecovery/NutritionSection.jsx

import React from 'react';
import { Apple, Coffee, Droplet, Brain } from 'lucide-react';

const NutritionSection = ({ userId }) => {
  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 text-center">
        <Apple className="mx-auto mb-4 text-green-600" size={48} />
        <h2 className="text-2xl font-bold text-green-900 mb-2">Nutrition for Brain Health</h2>
        <p className="text-green-700 mb-4 max-w-2xl mx-auto">
          Comprehensive nutrition guides, meal planning, and brain-healthy recipes are coming soon.
          In the meantime, here are key principles to get you started.
        </p>
      </div>

      {/* Key Principles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <Brain className="text-purple-600 mb-3" size={32} />
          <h3 className="font-semibold text-gray-900 mb-2">Brain-Healthy Foods</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Fatty fish (omega-3s)</li>
            <li>• Blueberries (antioxidants)</li>
            <li>• Nuts & seeds</li>
            <li>• Leafy greens</li>
            <li>• Dark chocolate (70%+)</li>
            <li>• Whole grains</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <Droplet className="text-blue-600 mb-3" size={32} />
          <h3 className="font-semibold text-gray-900 mb-2">Hydration</h3>
          <p className="text-sm text-gray-600 mb-3">
            Even mild dehydration impairs cognitive performance, mood, and focus.
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Aim for half your body weight in oz</li>
            <li>• Drink water first thing</li>
            <li>• Add electrolytes if needed</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <Coffee className="text-orange-600 mb-3" size={32} />
          <h3 className="font-semibold text-gray-900 mb-2">Caffeine Strategy</h3>
          <p className="text-sm text-gray-600 mb-3">
            Use caffeine strategically, not as a crutch for poor sleep.
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Wait 90-120 min after waking</li>
            <li>• Stop 10 hours before bed</li>
            <li>• Stay under 400mg/day</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <Apple className="text-green-600 mb-3" size={32} />
          <h3 className="font-semibold text-gray-900 mb-2">Blood Sugar</h3>
          <p className="text-sm text-gray-600 mb-3">
            Stable blood sugar = stable energy and focus.
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Combine protein + fat + fiber</li>
            <li>• Avoid sugar crashes</li>
            <li>• Eat regular meals</li>
          </ul>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Nutrition Wins for Brain Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-2">Start Your Day Right</h4>
            <p className="text-sm text-gray-600">
              Protein-rich breakfast within 90 minutes of waking stabilizes blood sugar and supports neurotransmitter production.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-2">Omega-3s are Essential</h4>
            <p className="text-sm text-gray-600">
              Your brain is ~60% fat. EPA and DHA (from fish or algae) support mood, memory, and cognitive function.
            </p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-2">Gut-Brain Connection</h4>
            <p className="text-sm text-gray-600">
              90% of serotonin is made in your gut. Support gut health with fiber, fermented foods, and probiotics.
            </p>
          </div>

          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-2">Timing Matters</h4>
            <p className="text-sm text-gray-600">
              Large meals cause energy crashes. Eat smaller, balanced meals every 3-4 hours for steady focus.
            </p>
          </div>
        </div>
      </div>

      {/* Sample Day */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
        <h3 className="font-semibold text-amber-900 mb-4">Sample Brain-Healthy Day</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 font-semibold min-w-[80px]">Morning</div>
            <div className="text-gray-700">
              <strong>Breakfast:</strong> 3 eggs, avocado, spinach, berries<br />
              <strong>Hydration:</strong> 16oz water, green tea
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-amber-600 font-semibold min-w-[80px]">Midday</div>
            <div className="text-gray-700">
              <strong>Lunch:</strong> Salmon, quinoa, mixed greens, olive oil<br />
              <strong>Snack:</strong> Handful of walnuts, dark chocolate
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-amber-600 font-semibold min-w-[80px]">Evening</div>
            <div className="text-gray-700">
              <strong>Dinner:</strong> Grass-fed beef, sweet potato, broccoli<br />
              <strong>Before Bed:</strong> Herbal tea, magnesium supplement
            </div>
          </div>
        </div>
      </div>

      {/* Resources Coming Soon */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <h3 className="font-semibold text-gray-900 mb-2">Coming Soon</h3>
        <p className="text-gray-600 text-sm">
          Full nutrition guides, meal plans, supplement recommendations, and recipes tailored for brain health and performance.
        </p>
      </div>
    </div>
  );
};

export default NutritionSection;
