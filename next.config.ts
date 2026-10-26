// SPDX-License-Identifier: MIT
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  outputFileTracingExcludes: {
    "/*": [".eve/**", ".output/**"],
  },
};

export default nextConfig;
