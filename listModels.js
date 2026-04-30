const express = require('express');
require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if(data.models) {
        data.models.forEach(m => console.log(m.name));
    }
  } catch (e) {
    console.error("Error fetching models:", e);
  }
}

listModels();
