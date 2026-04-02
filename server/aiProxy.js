const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const PORT = Number(process.env.AI_PROXY_PORT || 8787);
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ALLOWED_ORIGIN = process.env.AI_PROXY_ALLOWED_ORIGIN || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...corsHeaders
  });
  res.end(JSON.stringify(payload));
};

const parseBody = async (req) => {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
};

const writeSse = (res, payload) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

/**
 * Recursively find all SKILL.md files in a directory
 */
const findSkillFiles = (dir) => {
  let results = [];
  try {
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findSkillFiles(filePath));
      } else if (file === 'SKILL.md') {
        results.push(filePath);
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[ai-proxy] Error scanning skills in ${dir}:`, err.message);
  }
  return results;
};

/**
 * Load and concatenate all available skills from local and global paths
 */
const loadSkillsPayload = () => {
  const localSkillsDir = path.join(__dirname, '..', '.agents', 'skills');
  const globalSkillsDir = path.join(os.homedir(), '.agents', 'skills');

  const files = [
    ...findSkillFiles(localSkillsDir),
    ...findSkillFiles(globalSkillsDir)
  ];

  if (files.length === 0) return '';

  let skillsText = '\n\n### INJECTED SKILLS FROM PROJECT CONTEXT\n';
  files.forEach((file) => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const skillName = path.basename(path.dirname(file));
      skillsText += `\n--- SKILL: ${skillName} ---\n${content}\n`;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[ai-proxy] Could not read skill ${file}:`, err.message);
    }
  });

  return skillsText;
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/ai/stream') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  if (!API_KEY) {
    sendJson(res, 500, {
      error: 'Missing GEMINI_API_KEY environment variable'
    });
    return;
  }

  try {
    const body = await parseBody(req);

    // Inject skills into systemInstruction if available
    const injectedSkills = loadSkillsPayload();
    if (injectedSkills && body.systemInstruction && body.systemInstruction.parts) {
      body.systemInstruction.parts[0].text += injectedSkills;
      // eslint-disable-next-line no-console
      console.log(`[ai-proxy] Injected ${injectedSkills.length} characters of skill context`);
    }

    const endpoint = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent`
    );
    endpoint.searchParams.set('alt', 'sse');
    endpoint.searchParams.set('key', API_KEY);

    const upstreamResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const errorText = await upstreamResponse.text();
      sendJson(res, upstreamResponse.status || 500, {
        error: 'Upstream Gemini request failed',
        details: errorText
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      ...corsHeaders
    });

    const reader = upstreamResponse.body.getReader();
    const decoder = new TextDecoder();

    const pump = async () => {
      const { done, value } = await reader.read();

      if (done) {
        writeSse(res, '[DONE]');
        res.end();
        return;
      }

      res.write(decoder.decode(value, { stream: true }));
      await pump();
    };

    await pump();
  } catch (error) {
    sendJson(res, 500, {
      error: 'AI proxy error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[ai-proxy] listening on http://localhost:${PORT}`);
});
