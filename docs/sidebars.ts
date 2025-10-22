import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    "intro",
    {
      type: "category",
      label: "Getting Started",
      items: [
        "getting-started/quick-start",
        "getting-started/docker-deployment",
      ],
    },
    {
      type: "category",
      label: "Configuration",
      items: [
        "configuration/overview",
        "configuration/database",
        "configuration/storage",
        "configuration/imagor",
        "configuration/security",
      ],
    },
    {
      type: "category",
      label: "Deployment",
      items: [
        "deployment/migration",
        "deployment/docker",
        "deployment/kubernetes",
      ],
    },
    "architecture",
    "ecosystem",
  ],
};

export default sidebars;
