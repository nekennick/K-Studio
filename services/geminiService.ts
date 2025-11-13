



import { GoogleGenAI, Modality } from "@google/genai";
import type { GeneratedContent } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleApiError = (error: unknown): Promise<any> => {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        let errorMessage = error.message;
        try {
            // Attempt to parse a potential JSON error message from the API
            const potentialJson = errorMessage.substring(errorMessage.indexOf('{'));
            const parsedError = JSON.parse(potentialJson);
            if (parsedError.error && parsedError.error.message) {
                if (parsedError.error.status === 'RESOURCE_EXHAUSTED') {
                    errorMessage = "You've likely exceeded the request limit. Please wait a moment before trying again.";
                } else if (parsedError.error.code === 500 || parsedError.error.status === 'UNKNOWN') {
                    errorMessage = "An unexpected server error occurred. This might be a temporary issue. Please try again in a few moments.";
                } else {
                    errorMessage = parsedError.error.message;
                }
            }
        } catch (e) {
            // Not a JSON error, use original message
        }
        return Promise.reject(new Error(errorMessage));
    }
    return Promise.reject(new Error("An unknown error occurred while communicating with the API."));
};

export async function getFashionAdvice(
    prompt: string,
    imagePart: { base64: string; mimeType: string }
): Promise<GeneratedContent> {
    try {
        const parts = [
            { text: prompt },
            {
                inlineData: { data: imagePart.base64, mimeType: imagePart.mimeType },
            },
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
        });

        const text = response.text;
        if (!text) {
             throw new Error("The model did not return any text. It might have refused the request due to safety settings.");
        }
        
        return { imageUrl: null, text: text };
    } catch (error) {
        return handleApiError(error);
    }
}


export async function editImage(
    prompt: string,
    imageParts: { base64: string; mimeType: string }[],
    maskBase64: string | null
): Promise<GeneratedContent> {
  try {
    let fullPrompt = prompt;
    const parts: any[] = [];

    // If a mask is provided, the prompt needs to be modified to instruct the model
    // on how to use it.
    if (maskBase64) {
      fullPrompt = `Apply the following instruction only to the masked area of the image: "${prompt}". Preserve the unmasked area.`;
    }

    // Add image parts first, as this is a more robust order for image editing models.
    // The primary image is always the first one.
    if (imageParts.length > 0) {
        parts.push({
            inlineData: { data: imageParts[0].base64, mimeType: imageParts[0].mimeType },
        });
    }

    // The mask, if it exists, must follow the image it applies to.
    if (maskBase64) {
      parts.push({
        inlineData: { data: maskBase64, mimeType: 'image/png' },
      });
    }
    
    // Add any remaining images (secondary, tertiary, etc.)
    if (imageParts.length > 1) {
        imageParts.slice(1).forEach(img => {
            parts.push({
                inlineData: { data: img.base64, mimeType: img.mimeType },
            });
        });
    }

    // Add the text prompt as the last part of the request.
    parts.push({ text: fullPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const result: GeneratedContent = { imageUrl: null, text: null };
    const responseParts = response.candidates?.[0]?.content?.parts;

    if (responseParts) {
      for (const part of responseParts) {
        if (part.text) {
          result.text = (result.text ? result.text + "\n" : "") + part.text;
        } else if (part.inlineData) {
          result.imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    if (!result.imageUrl) {
        const finishReason = response.candidates?.[0]?.finishReason;
        const safetyRatings = response.candidates?.[0]?.safetyRatings;
        let errorMessage = "The model did not return an image. It might have refused the request. Please try a different image or prompt.";
        
        if (finishReason === 'SAFETY') {
            const blockedCategories = safetyRatings?.filter(r => r.blocked).map(r => r.category).join(', ');
            errorMessage = `The request was blocked for safety reasons. Categories: ${blockedCategories || 'Unknown'}. Please modify your prompt or image.`;
        }
        throw new Error(errorMessage);
    }

    return result;

  } catch (error) {
    return handleApiError(error);
  }
}

export async function generateLookbook(
    prompt: string,
    imagePart: { base64: string; mimeType: string },
    numImages: number
): Promise<string[]> {
    try {
        const promises: Promise<GeneratedContent>[] = [];
        for (let i = 0; i < numImages; i++) {
            // Pass null for maskBase64 as this flow doesn't use it.
            promises.push(editImage(prompt, [imagePart], null));
        }
        const results = await Promise.all(promises);
        const imageUrls = results.map(r => r.imageUrl).filter((url): url is string => !!url);
        
        if (imageUrls.length < numImages) {
          console.warn(`Generated only ${imageUrls.length}/${numImages} images.`);
        }
        if (imageUrls.length === 0) {
            throw new Error("Failed to generate any images for the lookbook. The model may have refused the request.");
        }
        
        return imageUrls;
    } catch (error) {
        if (error instanceof Error) {
            return Promise.reject(new Error(error.message));
        }
        return Promise.reject(new Error("An unknown error occurred during lookbook generation."));
    }
}


export async function generateImageEditsBatch(
    prompt: string,
    imageParts: { base64: string; mimeType: string }[]
): Promise<string[]> {
    try {
        const promises: Promise<GeneratedContent>[] = [];
        for (let i = 0; i < 4; i++) {
            // Pass null for maskBase64 as this flow doesn't use it.
            promises.push(editImage(prompt, imageParts, null));
        }
        const results = await Promise.all(promises);
        const imageUrls = results.map(r => r.imageUrl).filter((url): url is string => !!url);
        
        if (imageUrls.length === 0) {
          throw new Error("Failed to generate any image variations. The model may have refused the request.");
        }
        
        return imageUrls;
    } catch (error) {
        if (error instanceof Error) {
            // Re-throw the specific error message from a failed child `editImage` call
            return Promise.reject(new Error(error.message));
        }
        return Promise.reject(new Error("An unknown error occurred during batch image generation."));
    }
}

type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export async function generateImageFromText(
    prompt: string,
    aspectRatio: ImageAspectRatio
): Promise<GeneratedContent> {
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio,
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("The model did not return an image. It might have refused the request.");
    }

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/png;base64,${base64ImageBytes}`;

    return { imageUrl, text: null };

  } catch (error) {
    return handleApiError(error);
  }
}

export async function generateVideo(
    prompt: string,
    image: { base64: string; mimeType: string } | null,
    aspectRatio: '16:9' | '9:16',
    onProgress: (message: string) => void
): Promise<string> {
    try {
        onProgress("Initializing video generation...");

        const request = {
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                // Fix: Added missing 'resolution' property, which is required for video generation.
                resolution: '720p',
                aspectRatio: aspectRatio
            },
            ...(image && {
                image: {
                    imageBytes: image.base64,
                    mimeType: image.mimeType
                }
            })
        };

        let operation = await ai.models.generateVideos(request);
        
        onProgress("Polling for results, this may take a few minutes...");

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        if (operation.error) {
            throw new Error(typeof operation.error.message === 'string' ? (operation.error.message || "Video generation failed during operation.") : "Video generation failed during operation.");
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

        if (!downloadLink) {
            throw new Error("Video generation completed, but no download link was found.");
        }

        return `${downloadLink}&key=${process.env.API_KEY}`;

    } catch (error) {
        // Re-throw specific API errors
        if (error instanceof Error) {
            return handleApiError(error);
        }
        // Fallback for non-API errors
        throw new Error("An unknown error occurred during video generation.");
    }
}
