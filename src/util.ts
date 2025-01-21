// Helper function to parse the gradient string
const parseCSSGradient = (gradientString: string): any => {
  // Regex to match radial gradient
  const radialGradientRegex = /radial-gradient\(([^,]+?)\s+at\s+([^,]+?),/;
  // Regex to match linear gradient
  const linearGradientRegex = /linear-gradient\(([^,]+?),/;
  const colorStopRegex =
    /rgba?\((\d+),\s*(\d+),\s*(\d+),\s*(\d*\.?\d+)\)\s*(\d+)%|#([0-9a-fA-F]{3,6})\s*(\d+)%/g;

  let gradientType = null;
  let shapeSize = null;
  let position = null;
  let angle = null;

  if (gradientString.includes('radial-gradient')) {
    const radialMatch = gradientString.match(radialGradientRegex);
    if (!radialMatch) return null;
    gradientType = 'radial';
    shapeSize = radialMatch[1];
    position = radialMatch[2];
  } else if (gradientString.includes('linear-gradient')) {
    const linearMatch = gradientString.match(linearGradientRegex);
    if (!linearMatch) return null;
    gradientType = 'linear';
    angle = linearMatch[1];
  } else {
    return null;
  }

  const matches = [...gradientString.matchAll(colorStopRegex)];
  if (matches.length === 0) return null;

  const parsedColorStops = matches.map((match) => {
    if (match[1]) {
      // rgba color
      return {
        color: {
          r: parseInt(match[1], 10) / 255,
          g: parseInt(match[2], 10) / 255,
          b: parseInt(match[3], 10) / 255,
          a: parseFloat(match[4]),
        },
        position: parseFloat(match[5]) / 100,
      };
    } else {
      // hex color
      const hex = match[6];
      const r =
        parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16) /
        255;
      const g =
        parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16) /
        255;
      const b =
        parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16) /
        255;
      return {
        color: { r, g, b, a: 1 },
        position: parseFloat(match[7]) / 100,
      };
    }
  });

  return {
    type: gradientType,
    shapeSize: shapeSize ? shapeSize.trim() : null,
    position: position ? position.trim() : null,
    angle: angle ? angle.trim() : null,
    colorStops: parsedColorStops,
  };
};

// Utility function to detect gradient type
const detectGradientType = (
  gradientValue: string
): 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' => {
  // Simple detection logic based on the gradient string
  if (gradientValue.includes('radial')) {
    return 'GRADIENT_RADIAL';
  }
  return 'GRADIENT_LINEAR';
};

const fetchTeamComponents = async (teamId: string, apiKey: string) => {
  const response = await fetch(
    `https://api.figma.com/v1/teams/${teamId}/components`,
    {
      headers: {
        'X-Figma-Token': apiKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch components from Figma API');
  }

  const data = await response.json();
  return data.meta.components;
};

const defer = async (callback: () => Promise<void>) => {
  return new Promise<void>((resolve) => {
    setTimeout(async () => {
      await callback();
      resolve();
    }, 2);
  });
};

const flattenNodes = (nodes: SceneNode[]): SceneNode[] => {
  let allNodes: SceneNode[] = [];

  nodes.forEach((node) => {
    console.log('NODE TYPE', node.type);

    allNodes.push(node);
    if (
      (node.type == 'COMPONENT' ||
        node.type == 'COMPONENT_SET' ||
        node.type === 'INSTANCE' ||
        node.type === 'SECTION' ||
        node.type === 'FRAME' ||
        node.type === 'GROUP') &&
      'children' in node
    ) {
      const childNodes = explodeNode(node);
      allNodes = allNodes.concat(childNodes);
    }
  });
  return allNodes;
};

const explodeNode = (
  node:
    | FrameNode
    | GroupNode
    | InstanceNode
    | SectionNode
    | ComponentNode
    | ComponentSetNode
): SceneNode[] => {
  let nodes: SceneNode[] = [];
  if ('children' in node) {
    node.children.forEach((child) => {
      if (child.visible) {
        nodes.push(child);
        if (
          (child.type === 'INSTANCE' ||
            child.type === 'FRAME' ||
            child.type === 'GROUP' ||
            child.type === 'COMPONENT' ||
            child.type === 'SECTION' ||
            child.type === 'COMPONENT_SET') &&
          'children' in child
        ) {
          nodes = nodes.concat(
            explodeNode(
              child as
                | FrameNode
                | GroupNode
                | InstanceNode
                | SectionNode
                | ComponentNode
                | ComponentSetNode
            )
          );
        }
      }
    });
  }
  return nodes;
};

class ErrorWithPayload extends Error {
  cause: {
    node: SceneNode;
    message?: string;
  };

  constructor(
    message: string,
    cause: {
      node: SceneNode;
      message?: string;
    }
  ) {
    super(message);
    this.name = 'ErrorWithPayload';
    this.cause = cause;
    this.cause.message = message;
  }
}

export {
  parseCSSGradient,
  detectGradientType,
  fetchTeamComponents,
  defer,
  flattenNodes,
  ErrorWithPayload,
};
