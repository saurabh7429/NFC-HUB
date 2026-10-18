export const bJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "BusinessConfiguration",
  type: "object",
  required: ["schemaVersion", "id", "status", "name", "branding", "page", "links", "card", "publish"],
  additionalProperties: false,
  properties: {
    schemaVersion: {
      type: "integer",
      enum: [1]
    },
    id: {
      type: "string",
      pattern: "^[a-z0-9]{3,8}$"
    },
    status: {
      type: "string",
      enum: ["draft", "build-ready", "published", "archived"]
    },
    name: {
      type: "string",
      minLength: 1,
      maxLength: 100
    },
    tagline: {
      type: "string",
      maxLength: 150
    },
    branding: {
      type: "object",
      required: ["theme", "accentColor"],
      additionalProperties: false,
      properties: {
        logo: {
          type: ["string", "null"],
          pattern: "^i/[a-zA-Z0-9_.-]+$"
        },
        theme: {
          type: "string",
          enum: ["light", "dark", "auto"]
        },
        accentColor: {
          type: "string",
          pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"
        }
      }
    },
    page: {
      type: "object",
      required: ["mode", "title"],
      additionalProperties: false,
      properties: {
        mode: {
          type: "string",
          enum: ["link-hub", "direct-review"]
        },
        title: {
          type: "string",
          minLength: 1,
          maxLength: 120
        },
        description: {
          type: "string",
          maxLength: 300
        }
      }
    },
    links: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "type", "label", "url", "enabled", "order"],
        additionalProperties: false,
        properties: {
          id: {
            type: "string",
            pattern: "^[a-z0-9_-]+$"
          },
          type: {
            type: "string",
            enum: [
              "google-review",
              "instagram",
              "whatsapp",
              "facebook",
              "website",
              "phone",
              "email",
              "custom"
            ]
          },
          label: {
            type: "string",
            minLength: 1,
            maxLength: 60
          },
          url: {
            type: "string",
            format: "uri"
          },
          enabled: {
            type: "boolean"
          },
          order: {
            type: "integer",
            minimum: 0
          }
        }
      }
    },
    card: {
      type: "object",
      required: ["trimMm", "bleedMm", "qr"],
      additionalProperties: false,
      properties: {
        themeId: {
          type: ["string", "null"]
        },
        referenceImage: {
          type: ["string", "null"],
          pattern: "^i/[a-zA-Z0-9_.-]+$"
        },
        trimMm: {
          type: "object",
          required: ["width", "height"],
          additionalProperties: false,
          properties: {
            width: { type: "number", minimum: 10, maximum: 200 },
            height: { type: "number", minimum: 10, maximum: 200 }
          }
        },
        bleedMm: {
          type: "number",
          minimum: 0,
          maximum: 20
        },
        qr: {
          type: "object",
          required: ["xMm", "yMm", "sizeMm"],
          additionalProperties: false,
          properties: {
            xMm: { type: "number", minimum: 0 },
            yMm: { type: "number", minimum: 0 },
            sizeMm: { type: "number", minimum: 10, maximum: 100 }
          }
        },
        exports: {
          type: "object",
          additionalProperties: false,
          properties: {
            pdf: { type: "boolean" },
            jpg: { type: "boolean" },
            png: { type: "boolean" }
          }
        }
      }
    },
    publish: {
      type: "object",
      required: ["canonicalPath"],
      additionalProperties: false,
      properties: {
        canonicalPath: {
          type: "string",
          pattern: "^/b/[a-z0-9]{3,8}/$"
        },
        verifiedAt: {
          type: ["string", "null"],
          format: "date-time"
        }
      }
    }
  }
};

export const themeJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "CardThemeMetadata",
  type: "object",
  required: ["schemaVersion", "id", "name", "trimMm", "bleedMm", "safeAreaMm", "qrSlotMm", "supports"],
  additionalProperties: false,
  properties: {
    schemaVersion: {
      type: "integer",
      enum: [1]
    },
    id: {
      type: "string",
      pattern: "^[a-z0-9_-]+$"
    },
    name: {
      type: "string",
      minLength: 1,
      maxLength: 60
    },
    trimMm: {
      type: "object",
      required: ["width", "height"],
      additionalProperties: false,
      properties: {
        width: { type: "number", minimum: 10, maximum: 200 },
        height: { type: "number", minimum: 10, maximum: 200 }
      }
    },
    bleedMm: {
      type: "number",
      minimum: 0,
      maximum: 20
    },
    safeAreaMm: {
      type: "number",
      minimum: 0,
      maximum: 20
    },
    qrSlotMm: {
      type: "object",
      required: ["x", "y", "width", "height"],
      additionalProperties: false,
      properties: {
        x: { type: "number", minimum: 0 },
        y: { type: "number", minimum: 0 },
        width: { type: "number", minimum: 10 },
        height: { type: "number", minimum: 10 }
      }
    },
    supports: {
      type: "array",
      items: {
        type: "string",
        enum: ["pdf", "jpg", "png"]
      }
    }
  }
};

export const appConfigSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "AppConfig",
  type: "object",
  required: ["schemaVersion", "publicBaseUrl", "businessRoutePrefix", "defaultCardTrimMm", "rasterDpi", "allowFinalExportBeforePublish", "server"],
  additionalProperties: false,
  properties: {
    schemaVersion: {
      type: "integer",
      enum: [1]
    },
    publicBaseUrl: {
      type: "string",
      format: "uri"
    },
    businessRoutePrefix: {
      type: "string",
      pattern: "^/[a-zA-Z0-9_-]*$"
    },
    defaultCardTrimMm: {
      type: "object",
      required: ["width", "height"],
      additionalProperties: false,
      properties: {
        width: { type: "number", minimum: 10 },
        height: { type: "number", minimum: 10 }
      }
    },
    rasterDpi: {
      type: "integer",
      enum: [150, 300, 600]
    },
    allowFinalExportBeforePublish: {
      type: "boolean"
    },
    server: {
      type: "object",
      required: ["port", "host"],
      additionalProperties: false,
      properties: {
        port: { type: "integer", minimum: 1024, maximum: 65535 },
        host: { type: "string" }
      }
    }
  }
};
