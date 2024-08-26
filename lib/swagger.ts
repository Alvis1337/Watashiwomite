import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = async () => {
    const spec = createSwaggerSpec({
        apiFolder: "app/api",
        definition: {
            openapi: "3.0.0",
            info: {
                title: "Watashiwomite",
                version: "1.0",
            },
            components: {
                securitySchemes: {
                    MalBearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                    },
                    SonarrApiKey: {
                        type: "apiKey",
                        name: "NA",
                        in: "URL",
                        description: "Sonarr API Key",
                    },
                    TVDBApiKey: {
                        type: "apiKey",
                        name: "NA",
                        in: "Used to get token",
                        description: "TVDB API Key",
                    },
                },
            },
            security: [
                {
                    MalBearerAuth: [],
                },
                {
                    SonarrApiKey: [],
                },
                {
                    TVDBApiKey: [],
                },
            ],
        },
    });
    return spec;
};
