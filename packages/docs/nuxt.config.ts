export default defineNuxtConfig({
  extends: ["docus"],
  llms: {
    domain: "https://nuxtcrud.com/docs",
  },

  modules: ["@nuxthub/core"],
});
