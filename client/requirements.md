## Packages
recharts | For rendering the PSA levels line chart
framer-motion | For beautiful page transitions and interactive modal animations
date-fns | For human-readable date formatting in reports and charts

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  body: ["var(--font-body)"],
}

The backend API endpoints are defined in `@shared/routes`.
Assuming `@/hooks/use-auth` and `@/replit_integrations/audio` are present as per integrations setup.
