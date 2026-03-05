const conf = {
    baseURL: import.meta.env.VITE_API_BASE_URL || "https://api.agaarwalflexiblapackging.com",
    /** Optional URL for scale/weight from COM port (e.g. local bridge at http://localhost:5000/weight). */
    weightScaleUrl: import.meta.env.VITE_WEIGHT_SCALE_URL || "",
}

export default conf;