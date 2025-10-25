export const getErrorMessage = (error: unknown): string => {
    // Log the full error for debugging in a way that avoids "[object Object]".
    // By logging the object on its own line, browser consoles can inspect it.
    console.error("Full error object received by error handler:");
    console.error(error);

    // Prioritize specific properties from Supabase/PostgREST which are often most descriptive.
    if (error && typeof error === 'object') {
        if ('details' in error && typeof (error as any).details === 'string' && (error as any).details) {
            return (error as any).details;
        }
        if ('message' in error && typeof (error as any).message === 'string' && (error as any).message) {
            return (error as any).message;
        }
    }

    // Handle standard JavaScript Error objects.
    if (error instanceof Error) {
        return error.message;
    }

    // Handle cases where the error is just a string.
    if (typeof error === 'string' && error.length > 0) {
        return error;
    }
    
    // For anything else, try to serialize it to JSON.
    try {
        const stringified = JSON.stringify(error);
        if (stringified && stringified !== '{}' && stringified !== '[]') {
            return stringified;
        }
    } catch (e) {
        // JSON.stringify can fail on circular objects, so we catch and proceed to the fallback.
    }

    // If all else fails, return an absolute fallback message. This prevents "[object Object]" from being shown in the UI.
    return 'An unexpected error occurred. Please check the developer console for details.';
};
