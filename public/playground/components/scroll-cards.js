/**
 * Scroll Cards Component
 *
 * Usage:
 * <div x-data="scrollCards()" x-bind="container">
 *   <template x-for="col in columns" :key="col.id">
 *     <div x-bind="column(col)">
 *       <template x-for="card in col.cards" :key="card.id">
 *         <div x-html="renderCard(card)"></div>
 *       </template>
 *     </div>
 *   </template>
 * </div>
 */

export function scrollCards() {
  return {
    // Card data
    cards: {
      team: {
        id: 'team',
        title: 'Your team',
        desc: 'Invite and manage your team members.',
        members: [
          { initials: 'EL', name: 'Emmeline Labrie', email: 'emmeline.labrie@example.com', color: 'violet' },
          { initials: 'ZW', name: 'Zac Wight', email: 'zac.wight@example.com', color: 'jade' }
        ]
      },
      signup: {
        id: 'signup',
        title: 'Sign up'
      },
      notifications: {
        id: 'notifications',
        title: 'Notifications',
        desc: 'Manage your notification settings.'
      },
      pricing: {
        id: 'pricing',
        title: 'Pricing',
        desc: 'No credit card required. 30-day trial.'
      },
      financial: {
        id: 'financial',
        title: 'Financial performance',
        desc: "Review your company's KPIs."
      },
      companyCard: {
        id: 'companyCard',
        title: 'Your company card',
        desc: 'View and manage your corporate card.'
      },
      invoice: {
        id: 'invoice',
        title: 'Invoice paid'
      },
      activity: {
        id: 'activity',
        title: 'Recent activity',
        desc: 'Review what has happened over the past days.'
      },
      todo: {
        id: 'todo',
        title: 'To-do',
        desc: 'Stay on top of your daily tasks.'
      }
    },

    columns: [
      { id: 'left', direction: 'up', cards: ['team', 'signup', 'notifications', 'pricing'] },
      { id: 'right', direction: 'down', cards: ['financial', 'companyCard', 'invoice', 'activity', 'todo'] }
    ],

    container: {
      'class': 'grid grid-cols-2 gap-4 h-full'
    },

    column(col) {
      return {
        'class': `flex flex-col gap-4 ${col.direction === 'up' ? 'animate-scroll-up' : 'animate-scroll-down'}`
      }
    }
  }
}

// Register with Alpine
document.addEventListener('alpine:init', () => {
  Alpine.data('scrollCards', scrollCards)
})
