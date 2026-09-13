// Technical Knowledge Base & Runbooks for API & Integration Support
const VAULT_NOTES = [
  {
    id: '01_API_SPEC_FACTURACION',
    filename: '01_API_SPEC_FACTURACION.md',
    title: 'Especificación API REST: Facturación & Órdenes',
    tag: '#API #JSONSchema #Postman',
    updated: '2026-09-02',
    content: `# Especificación de la API de Facturación & Validación de Payloads

## Endpoint: POST /api/v1/invoices
- **Autenticación**: Header \`Authorization: Bearer <API_KEY>\`
- **Content-Type**: \`application/json\`

### Reglas Críticas de Esquema (Schema Validation):
1. **Campos Numéricos**: \`price\`, \`quantity\` y \`discount\` DEBEN ser números (float/integer), nunca strings con formato de moneda (ej: \`"54000"\` es inválido; debe ser \`54000.00\`).
2. **Impuestos (\`tax_id\`)**: Es obligatorio especificar el identificador de impuesto para cada ítem.
3. **Códigos de Respuesta**:
   - \`201 Created\`: Factura emitida correctamente.
   - \`400 Bad Request\`: Formato JSON malformado.
   - \`422 Unprocessable Entity\`: Error de validación en los campos del payload.
   - \`401 / 403\`: Token inválido o permisos insuficientes.`
  },
  {
    id: '02_MCP_PROTOCOL_GUIDE',
    filename: '02_GUIA_PROTOCOLO_MCP.md',
    title: 'Integración de Agentes de IA vía MCP (Model Context Protocol)',
    tag: '#MCP #AIAgents #Integraciones',
    updated: '2026-09-03',
    content: `# Guía de Conexión de Agentes de IA mediante Servidores MCP

## Arquitectura Model Context Protocol (MCP)
- MCP permite a modelos de lenguaje (Claude, GPT, Llama) ejecutar acciones sobre la API de manera segura mediante \`Tool Calls\`.
- Cada herramienta define su \`inputSchema\` en formato JSON Schema estricto.

### Resolución de Incidencias Comunes en MCP:
- **Error 504 / Tool Call Timeout**: Ocurre cuando la base de datos o el endpoint tarda más de 5000ms. Solución: Aumentar timeout en \`mcp-config.json\` y optimizar el pool de conexiones.
- **Circuit Breakers en Agentes**: Si el proveedor de IA principal devuelve 429 (Rate Limit) o 400, el router conmuta automáticamente al modelo de contingencia.`
  },
  {
    id: '03_RUNBOOK_AUTENTICACION',
    filename: '03_RUNBOOK_AUTENTICACION_TOKENS.md',
    title: 'Runbook: Autenticación, Webhooks y Errores 401/403',
    tag: '#Auth #Bearer #Webhooks',
    updated: '2026-08-30',
    content: `# Runbook de Autenticación y Webhooks

## Troubleshooting de Errores 401 / 403:
- **Causa 1**: Token Bearer vencido (vigencia estándar: 24 horas para tokens dinámicos; tokens estáticos en panel de desarrolladores).
- **Causa 2**: Headers mal formateados (ej: omitir el prefijo \`Bearer \` en el header \`Authorization\`).

## Webhooks y Reintentos:
- Si el servidor del cliente no responde con \`200 OK\` en menos de 3000ms, nuestro gateway reintenta a los 5m, 15m y 1h con retroceso exponencial (Exponential Backoff).`
  },
  {
    id: '04_OBSERVABILIDAD_PM2_LINUX',
    filename: '04_OBSERVABILIDAD_PM2_LINUX.md',
    title: 'Diagnóstico de Servidor: PM2, Nginx & Fugas de Memoria',
    tag: '#PM2 #Linux #NodeJS #502',
    updated: '2026-09-01',
    content: `# Diagnóstico de Infraestructura y Procesos PM2

## Detección de Fugas de Memoria (Memory Leaks):
- Cuando un endpoint realiza consultas SQL sin paginar (\`SELECT *\` sobre miles de registros), el heap de Node.js supera el límite configurado (\`max_memory_restart: '1G'\`).
- **Comportamiento**: PM2 reinicia el worker, provocando que Nginx devuelva \`502 Bad Gateway\` durante los segundos de arranque.
- **Solución**: Aplicar paginación estricta (\`LIMIT 20 OFFSET X\`) y optimizar consultas en PostgreSQL.`
  },
  {
    id: '05_MODELO_DATOS_POSTGRES',
    filename: '05_MODELO_DATOS_POSTGRES.md',
    title: 'Base de Datos PostgreSQL Supabase: Deduplicación & UUIDs',
    tag: '#Postgres #SQL #Supabase',
    updated: '2026-09-02',
    content: `# PostgreSQL Supabase: Reglas de Deduplicación y Manejo de UUIDs

## Gotcha Crítico en Funciones Agregadas sobre UUIDs:
- En PostgreSQL, invocar \`MIN(id)\` o \`MAX(id)\` sobre columnas de tipo \`UUID\` arroja:
  \`error: function min(uuid) does not exist\`
- **Solución en Producción**: Realizar casting explícito a texto y luego a UUID:
  \`(MIN(id::text))::uuid\``
  }
];

// Production Diagnostic Scenarios with Distinct, Natural & Personalized Customer Messages
const SCENARIOS = {
  'api-422-payload': {
    title: 'Error 422: Payload JSON con Formato Inválido en Factura',
    service: 'api-gateway / billing-service',
    sourceFile: '01_API_SPEC_FACTURACION.md',
    badgeText: 'Facturación & Esquemas JSON',
    httpDetails: {
      method: 'POST',
      endpoint: '/api/v1/invoices',
      statusCode: '422 Unprocessable Entity',
      client: 'Zapier / Make (Cliente: Tienda Moda S.A.S)'
    },
    logs: [
      'POST /api/v1/invoices - Cliente: Tienda Moda S.A.S [Zapier Module]',
      'Headers: { "Authorization": "Bearer tok_live_89a...", "Content-Type": "application/json" }',
      'Body: { "customer_id": "cust_98412", "items": [{"name": "Plan Pro", "price": "$ 54,000 COP"}] }',
      '422 Unprocessable Entity - Response Time: 38ms',
      'ValidationError: "items[0].price" must be a valid number. Received string "$ 54,000 COP"',
      'ValidationError: "items[0].tax_id" is required for electronic tax invoice.',
      'Alerta de soporte: Petición de facturación retenida por validación de esquema.'
    ],
    diagnosis: {
      title: 'Validación de Esquema Fallida: Tipo String en Precio y Falta de tax_id',
      sourceMatch: '01_API_SPEC_FACTURACION.md (Score: 0.99)',
      rootCause: 'En el mapeo de Zapier, el cliente pasó el valor de venta con formato de moneda ("$ 54,000 COP") en lugar de un número decimal puro (54000.00), y no incluyó el código de impuesto "tax_id" requerido para la facturación electrónica.',
      codeOrigin: 'controllers/invoiceController.js:48 -> validateInvoicePayload()',
      operationalImpact: 'La factura queda en cola sin emitirse y el cliente final no recibe su comprobante de pago.',
      customerMessage: `¡Hola, Carlos! Un gusto saludarte ✨

Estuve revisando la factura de tu tienda que quedó en estado pendiente en Zapier y ya identifiqué exactamente qué debemos ajustar en el módulo:

1. En el campo "Precio", la plataforma envió el texto "$ 54,000 COP". Para que el sistema lo procese, solo necesitamos pasar el número limpio: 54000.00.
2. Además, nos faltó mapear el identificador de impuesto "tax_id" (por ejemplo: "tax_iva_19").

Te preparé el ejemplo de cómo debe quedar el JSON en la pestaña de al lado para que solo lo copies en Zapier o Make. Pruébalo y avísame si lograste emitirla, ¡aquí sigo súper pendiente de ti!`,
      badPayload: `{
  "customer_id": "cust_98412",
  "payment_method": "credit_card",
  "items": [
    {
      "name": "Suscripción Plan Pro",
      "price": "$ 54,000 COP" // ❌ Error: String con formato
      // ❌ Error: Falta campo "tax_id"
    }
  ]
}`,
      goodPayload: `{
  "customer_id": "cust_98412",
  "payment_method": "credit_card",
  "items": [
    {
      "product_id": "prod_3341",
      "name": "Suscripción Plan Pro",
      "quantity": 1,
      "price": 54000.00,        // ✅ Corregido: Número decimal
      "tax_id": "tax_iva_19"     // ✅ Corregido: Campo obligatorio
    }
  ]
}`,
      curlCommand: `curl -X POST https://api.tuempresa.com/v1/invoices \\
  -H "Authorization: Bearer TU_API_KEY_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_id": "cust_98412",
    "payment_method": "credit_card",
    "items": [
      {
        "product_id": "prod_3341",
        "name": "Suscripción Plan Pro",
        "quantity": 1,
        "price": 54000.00,
        "tax_id": "tax_iva_19"
      }
    ]
  }'`,
      serverPatch: `// Validación en controllers/invoiceController.js con Joi / Zod
const invoiceSchema = Joi.object({
  customer_id: Joi.string().required(),
  payment_method: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      product_id: Joi.string().optional(),
      name: Joi.string().required(),
      quantity: Joi.number().min(1).default(1),
      price: Joi.number().positive().required(), // Validación numérica estricta
      tax_id: Joi.string().required()
    })
  ).min(1).required()
});`
    }
  },
  'auth-token-403': {
    title: 'Error 401/403: Bearer Token Expirado en Pasarela de Integración',
    service: 'api-gateway-service (PID 10)',
    sourceFile: '03_RUNBOOK_AUTENTICACION_TOKENS.md',
    badgeText: 'Autenticación & Webhooks',
    httpDetails: {
      method: 'POST',
      endpoint: '/api/v1/shipping/generate-waybill',
      statusCode: '403 Forbidden',
      client: 'Integración API / Gateway de Despachos'
    },
    logs: [
      'POST /api/v1/shipping/generate-waybill - Petición ID: 7c43ac1d-c50b-4b94',
      'Headers: { "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." }',
      '403 Forbidden - Response: {"error": "Token has expired or signature is invalid"}',
      '⚠️ Token de más de 24 horas de antigüedad rechazado por el gateway de seguridad.',
      'Conmutación por contingencia: Generando transacción de respaldo (TRACKING: GUIA-LOG-000542)',
      'Notificación de alerta enviada al canal de soporte L2.'
    ],
    diagnosis: {
      title: 'Token JWT / Bearer Expirado en Servicio de Integración',
      sourceMatch: '03_RUNBOOK_AUTENTICACION_TOKENS.md (Score: 0.97)',
      rootCause: 'El token de autenticación Bearer enviado en la cabecera superó su tiempo de vida útil de 24 horas y el cliente no implementó el refresco automático previo a la llamada.',
      codeOrigin: 'src/services/shippingClient.js:112 -> dispatchWaybill()',
      operationalImpact: 'Las órdenes se desvían a transportadoras de contingencia aumentando el tiempo de emisión del número de tracking.',
      customerMessage: `¡Hola equipo de Envíos! 👋

Estuvimos monitoreando la generación de guías y notamos que la pasarela logística rechazó la solicitud con un código 403 Forbidden.

El motivo es que el token Bearer con el que se están autenticando ya cumplió sus 24 horas de vigencia. Para que no vuelva a detenerse el despacho:

• Pueden solicitar un nuevo token automáticamente consumiendo el endpoint /oauth/token antes de que expire.
• O si prefieren una conexión fija sin vencimiento diario, pueden generar una API Key permanente desde su panel en Configuración > Credenciales.

En la pestaña "2. Payloads" les dejé el script listo para renovar el token automáticamente en Node.js o Postman. ¡Un abrazo!`,
      badPayload: `// Cabecera enviada por el cliente:
Authorization: Bearer eyJhbGciOiJSUzI1Ni... (Token emitido hace 36 horas)
// ❌ Error: Token expirado (JWT exp timestamp superado)`,
      goodPayload: `// Cabecera correcta con Token renovado:
Authorization: Bearer eyJhbGciOiJSUzI1Ni... (Token recién obtenido vía /oauth/token)
// ✅ Token válido con vigencia de 24 horas`,
      curlCommand: `// Pre-request Script para Postman (Renovación Automática):
pm.sendRequest({
    url: 'https://api.tuempresa.com/v1/oauth/token',
    method: 'POST',
    header: 'Content-Type:application/json',
    body: { mode: 'raw', raw: JSON.stringify({ grant_type: 'client_credentials', client_id: 'ID', client_secret: 'SECRET' }) }
}, function (err, res) {
    pm.environment.set("bearer_token", res.json().access_token);
});`,
      serverPatch: `// Rutina de renovación automática de Bearer Token en Node.js:
async function getValidAuthToken() {
  if (!cachedToken || Date.now() >= tokenExpiresAt - 60000) {
    const res = await axios.post('https://api.tuempresa.com/v1/oauth/token', {
      client_id: process.env.API_CLIENT_ID,
      client_secret: process.env.API_CLIENT_SECRET,
      grant_type: 'client_credentials'
    });
    cachedToken = res.data.access_token;
    tokenExpiresAt = Date.now() + (res.data.expires_in * 1000);
  }
  return cachedToken;
}`
    }
  },
  'pm2-memory-crash': {
    title: 'Error 502 Bad Gateway: Saturación de Memoria en Servidor PM2',
    service: 'pm2 cluster / node-api-worker (PID 3)',
    sourceFile: '04_OBSERVABILIDAD_PM2_LINUX.md',
    badgeText: 'Servidor & Optimización PM2',
    httpDetails: {
      method: 'GET',
      endpoint: '/api/v1/invoices/export-all',
      statusCode: '502 Bad Gateway (Nginx Proxy)',
      client: 'Sincronizador ERP (Cliente ID: 4128)'
    },
    logs: [
      'GET /api/v1/invoices/export-all - Invocado por ERP Cliente ID: 4128',
      'Worker 3: Heap memory usage: 1042MB / 1024MB limit',
      '[PM2] Process 3 killed due to max-memory-restart (1024M exceeded)',
      'Nginx reverse-proxy: 502 Bad Gateway on /api/v1/invoices/export-all',
      '[PM2] Process 3 restarted automatically in 420ms (PID: 28411)',
      'Worker 3 online. Recargando conexiones al pool de PostgreSQL Supabase.'
    ],
    diagnosis: {
      title: 'Reinicio de Proceso Node.js en PM2 por Desbordamiento de Memoria (1GB Heap Limit)',
      sourceMatch: '04_OBSERVABILIDAD_PM2_LINUX.md (Score: 0.95)',
      rootCause: 'El endpoint /export-all ejecutó un SELECT * sin paginación sobre 25,000 registros, superando el límite de 1GB de RAM del proceso Node.js y forzando a Nginx a responder 502 mientras PM2 levantaba el worker.',
      codeOrigin: 'src/controllers/exportController.js:89 -> exportInvoicesToStream()',
      operationalImpact: 'Micro-cortes temporales de 2 a 3 segundos para peticiones concurrentes.',
      customerMessage: `Hola, Laura 👋 Gracias por consultarnos sobre la interrupción durante la descarga.

Revisamos el servidor y encontramos que la sincronización intentó descargar más de 25,000 facturas en una sola petición síncrona, lo que superó el límite de memoria del canal.

Para que tu ERP descargue toda la información de forma fluida y sin caídas:
1. Te recomendamos paginar las consultas usando ?page=1&limit=100.
2. O bien, utilizar nuestro servicio de exportación en segundo plano (/export-job) que genera un archivo comprimido descargable.

Te comparto en la siguiente pestaña la consulta optimizada. ¡Quedo a tu disposición!`,
      badPayload: `// Petición riesgosa sin paginar:
GET /api/v1/invoices/export-all
// ❌ Provoca: SELECT * FROM invoices (Trae 25,000 filas a memoria de golpe)`,
      goodPayload: `// Petición optimizada con cursor / paginación:
GET /api/v1/invoices?page=1&limit=100
// ✅ Respuesta en 24ms con solo 100 registros por página`,
      curlCommand: `curl -X GET "https://api.tuempresa.com/v1/invoices?page=1&limit=100" \\
  -H "Authorization: Bearer TU_API_KEY"`,
      serverPatch: `-- Consulta SQL optimizada en PostgreSQL:
SELECT id, invoice_number, customer_id, total, status, created_at 
FROM invoices 
WHERE account_id = $1 
ORDER BY created_at DESC 
LIMIT 100 OFFSET $2;`
    }
  },
  'mcp-tool-timeout': {
    title: 'Timeout en Agente de IA: Herramienta MCP Superó Límite de 5s',
    service: 'mcp-server / ai-agent-router',
    sourceFile: '02_GUIA_PROTOCOLO_MCP.md',
    badgeText: 'Agentes de IA & Protocolo MCP',
    httpDetails: {
      method: 'MCP ToolCall',
      endpoint: 'tools/call -> "consultar_estado_cuenta"',
      statusCode: '504 Gateway Timeout (MCP)',
      client: 'Agente Claude 3.5 Sonnet / LLM Workflow'
    },
    logs: [
      '[MCP Server] Conexión establecida desde Agente Claude 3.5 Sonnet vía STDIO',
      '[MCP ToolCall] Invocando tool "consultar_estado_cuenta" con args: {"client_id": "CLI-890"}',
      '[MCP Gateway] DB query latency: 5200ms > timeout threshold (5000ms)',
      '[MCP Error] ToolCallExecutionError: MCP Tool timeout after 5.0s (Sequential Scan en BD)',
      '[AI Router] Circuit Breaker activated. Conmutando a respuesta de contingencia.',
      '[AI Agent] Respuesta generada exitosamente vía fallback de baja latencia.'
    ],
    diagnosis: {
      title: 'Timeout en Ejecución de Herramienta MCP por Falta de Índice en Base de Datos',
      sourceMatch: '02_GUIA_PROTOCOLO_MCP.md (Score: 0.98)',
      rootCause: 'El agente de IA invocó la herramienta MCP "consultar_estado_cuenta", pero la consulta SQL subyacente realizó un sequential scan por falta de índice en "client_id", superando el timeout de 5 segundos de MCP.',
      codeOrigin: 'mcp-server/tools/accountStatement.ts:62 -> executeTool()',
      operationalImpact: 'El agente de IA tardaba en responder y tenía que recurrir a la respuesta aproximada de contingencia.',
      customerMessage: `¡Hola, Daniel! Qué genial la integración con agentes de IA que están construyendo 🤖💚

Estuve revisando por qué tu agente Claude experimentaba demoras al consultar el estado de cuenta. La llamada al servidor MCP se ejecutaba bien, pero la búsqueda en la base de datos tardaba 5.2 segundos por falta de un índice en el ID del cliente.

Ya generamos el índice optimizado y ahora la respuesta toma solo 18 milisegundos. Además, en la pestaña "2. Payloads" te dejé la configuración para ampliar el timeout de tu servidor MCP a 10s para peticiones complejas. ¡Cualquier duda adicional aquí me tienes!`,
      badPayload: `// Tool Call ejecutado por el Agente de IA:
{
  "name": "consultar_estado_cuenta",
  "arguments": { "client_id": "CLI-890" }
}
// ❌ Error: Timeout 5000ms excedido en la respuesta del servidor MCP`,
      goodPayload: `// Configuración optimizada en mcp-config.json:
{
  "mcpServers": {
    "sentinel-api-tools": {
      "command": "node",
      "args": ["./dist/mcp-server.js"],
      "env": { "MCP_TOOL_TIMEOUT_MS": "10000" }
    }
  }
}`,
      curlCommand: `-- Índice SQL para acelerar el Tool Call de MCP a < 20ms:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_client_id_date 
ON customer_transactions (client_id, created_at DESC);`,
      serverPatch: `// Handler de la Tool MCP con timeout seguro y fallback en mcp-server.ts:
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "consultar_estado_cuenta") {
    const clientId = request.params.arguments?.client_id;
    const data = await db.query('SELECT * FROM customer_transactions WHERE client_id = $1 LIMIT 50', [clientId]);
    return { content: [{ type: "text", text: JSON.stringify(data.rows) }] };
  }
});`
    }
  },
  'postgres-uuid': {
    title: 'Error SQL en Postgres Supabase: function min(uuid) does not exist',
    service: 'sentinel-db-worker (PID 4)',
    sourceFile: '05_MODELO_DATOS_POSTGRES.md',
    badgeText: 'Base de Datos & SQL',
    httpDetails: {
      method: 'DB Background Query',
      endpoint: 'PostgreSQL Supabase (Port 5432)',
      statusCode: 'SQL State 42883 (Undefined Function)',
      client: 'Microservicio de Sincronización de Inventario'
    },
    logs: [
      '4|sentinel | [DB AUDITOR] Ejecutando sincronización de inventario en Supabase...',
      '4|sentinel | [DB AUDITOR] Query: SELECT MIN(id) FROM products GROUP BY sku, warehouse_id',
      '4|sentinel | error: function min(uuid) does not exist',
      '4|sentinel | HINT: No function matches the given name and argument types. You might need to add explicit type casts.',
      '4|sentinel | at Parser.parseErrorMessage (/var/www/node_modules/pg-protocol/dist/parser.js:287:98)'
    ],
    diagnosis: {
      title: 'Fallo de Función de Agregación sobre Tipo UUID en PostgreSQL',
      sourceMatch: '05_MODELO_DATOS_POSTGRES.md (Score: 0.99)',
      rootCause: 'PostgreSQL no implementa de forma directa la función agregada MIN() sobre identificadores UUID. Se requiere un casting explícito a tipo texto y reconversión a UUID para realizar la agrupación de deduplicación.',
      codeOrigin: 'src/services/dbSync.js:142 -> deduplicateInventory()',
      operationalImpact: 'El proceso en segundo plano de sincronización de catálogo se detuvo con código de salida 1.',
      customerMessage: `Hola, Andrés 👋 Un gusto saludarte.

Con respecto a la sincronización de inventario, el error "function min(uuid) does not exist" ocurre porque en PostgreSQL las funciones agregadas como MIN() o MAX() no operan directamente sobre identificadores de tipo UUID.

Para resolverlo de forma segura en tu consulta, convertimos el UUID temporalmente a texto y luego de vuelta a UUID: (MIN(id::text))::uuid.

En la pestaña "2. Payloads" te dejé el query corregido y el fragmento para tu backend en Node.js. ¡Quedo muy atenta por si necesitas algo más!`,
      badPayload: `-- Query fallido (UUID no soporta MIN):
SELECT MIN(id) FROM products GROUP BY sku, warehouse_id;
-- ❌ Error: function min(uuid) does not exist`,
      goodPayload: `-- Query corregido con doble casting seguro:
SELECT (MIN(id::text))::uuid AS primary_id, sku, warehouse_id, COUNT(*) as duplicates
FROM products 
GROUP BY sku, warehouse_id 
HAVING COUNT(*) > 1;
-- ✅ Ejecución exitosa en 14ms`,
      curlCommand: `-- Script de mitigación y verificación en Postgres:
SELECT (MIN(id::text))::uuid AS keep_id, sku, COUNT(*) 
FROM products 
GROUP BY sku 
ORDER BY COUNT(*) DESC LIMIT 10;`,
      serverPatch: `// Corrección en microservicio Node.js (src/services/dbSync.js):
- const sql = 'SELECT MIN(id) FROM products GROUP BY sku, warehouse_id';
+ const sql = 'SELECT (MIN(id::text))::uuid AS id FROM products GROUP BY sku, warehouse_id';`
    }
  }
};

let currentScenario = 'api-422-payload';
let liveStreamInterval = null;

// DOM references
const vaultListEl = document.getElementById('vault-notes-list');
const terminalLogsEl = document.getElementById('terminal-logs');
const emptyAiStateEl = document.getElementById('empty-ai-state');
const diagnosisCardEl = document.getElementById('diagnosis-card');
const aiStatusBadgeEl = document.getElementById('ai-status-badge');
const promptModalEl = document.getElementById('prompt-modal');
const noteModalEl = document.getElementById('note-modal');

document.addEventListener('DOMContentLoaded', () => {
  renderVaultNotes();
  setupEventListeners();
  startRealBackgroundLogs();
  
  // Run initial real scenario
  setTimeout(() => {
    triggerScenario('api-422-payload');
  }, 600);
});

function renderVaultNotes() {
  vaultListEl.innerHTML = '';
  VAULT_NOTES.forEach(note => {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.id = `note-item-${note.id}`;
    item.innerHTML = `
      <div class="note-title">
        <i class="fa-solid fa-file-lines text-rose"></i>
        <span>${note.filename}</span>
      </div>
      <div class="note-meta">
        <span class="note-tag">${note.tag}</span>
        <span>${note.updated}</span>
      </div>
    `;
    item.addEventListener('click', () => openNoteModal(note));
    vaultListEl.appendChild(item);
  });
}

function startRealBackgroundLogs() {
  const realIdleLogs = [
    '200 OK | GET /api/v1/healthcheck - 2ms [API Cluster Activo]',
    '200 OK | POST /api/v1/webhooks/payment - Webhook recibido y procesado',
    '200 OK | GET /api/v1/invoices/inv_9042 - 18ms [PostgreSQL Supabase]',
    '200 OK | POST /api/v1/customers/sync - Sincronización exitosa con CRM',
    'MCP-Server | Heartbeat: Herramientas listas para agentes de IA'
  ];

  liveStreamInterval = setInterval(() => {
    const randomLog = realIdleLogs[Math.floor(Math.random() * realIdleLogs.length)];
    appendRealLog(randomLog);
  }, 4500);
}

function appendRealLog(rawText) {
  const line = document.createElement('div');
  line.className = 'log-line';

  let colorStyle = 'color: #e2d9f3;';
  if (rawText.includes('❌') || rawText.includes('Error') || rawText.includes('error:') || rawText.includes('502') || rawText.includes('422') || rawText.includes('403') || rawText.includes('504')) {
    colorStyle = 'color: #fb7185; background: rgba(251, 113, 133, 0.12); padding: 2px 6px; border-radius: 4px; font-weight: 600;';
  } else if (rawText.includes('⚠️') || rawText.includes('Fallback') || rawText.includes('Circuit') || rawText.includes('Timeout') || rawText.includes('ValidationError')) {
    colorStyle = 'color: #fed7aa; font-weight: 500;';
  } else if (rawText.includes('200 OK') || rawText.includes('éxito') || rawText.includes('online')) {
    colorStyle = 'color: #86efac;';
  }

  line.innerHTML = `<span style="${colorStyle}">${escapeHtml(rawText)}</span>`;
  terminalLogsEl.appendChild(line);
  terminalLogsEl.scrollTop = terminalLogsEl.scrollHeight;
}

function triggerScenario(scenarioKey) {
  const scenario = SCENARIOS[scenarioKey];
  if (!scenario) return;

  currentScenario = scenarioKey;

  document.querySelectorAll('.btn-scenario').forEach(btn => {
    btn.classList.toggle('active-scenario', btn.dataset.scenario === scenarioKey);
  });

  // Highlight matched technical note
  document.querySelectorAll('.note-item').forEach(item => item.classList.remove('highlighted'));
  const matchedNote = VAULT_NOTES.find(n => n.filename === scenario.sourceFile);
  if (matchedNote) {
    const el = document.getElementById(`note-item-${matchedNote.id}`);
    if (el) {
      el.classList.add('highlighted');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  aiStatusBadgeEl.textContent = 'Analizando petición...';
  aiStatusBadgeEl.className = 'badge badge-rose';

  let delay = 0;
  scenario.logs.forEach((logText, index) => {
    setTimeout(() => {
      appendRealLog(logText);
      if (index === scenario.logs.length - 1) {
        renderDiagnosis(scenario);
      }
    }, delay);
    delay += 250;
  });
}

function renderDiagnosis(scenario) {
  emptyAiStateEl.classList.add('hidden');
  diagnosisCardEl.classList.remove('hidden');

  aiStatusBadgeEl.textContent = 'Diagnóstico Listo';
  aiStatusBadgeEl.className = 'badge badge-mint';

  const diag = scenario.diagnosis;
  const http = scenario.httpDetails;

  diagnosisCardEl.innerHTML = `
    <!-- Top Header -->
    <div class="diag-header">
      <div class="diag-title">
        <i class="fa-solid fa-triangle-exclamation text-rose"></i>
        <span>${diag.title}</span>
      </div>
      <span class="diag-source-badge"><i class="fa-solid fa-bookmark"></i> ${diag.sourceMatch}</span>
    </div>

    <!-- Mini Incoming Request Banner -->
    <div class="incoming-req-box">
      <div class="req-badge-row">
        <span><span class="req-method">${http.method}</span> <strong style="color: #fdf4f8;">${http.endpoint}</strong></span>
        <span class="req-status-pill">${http.statusCode}</span>
      </div>
      <div style="color: var(--text-muted); font-size: 0.7rem;">Cliente / Origen: <strong>${http.client}</strong></div>
    </div>

    <!-- 4-Tab Selector inside Diagnosis -->
    <div class="diag-tabs-nav">
      <button class="diag-nav-btn active" onclick="switchDiagTab('client-msg')"><i class="fa-solid fa-heart"></i> 1. Respuesta</button>
      <button class="diag-nav-btn" onclick="switchDiagTab('payload-diff')"><i class="fa-solid fa-file-code"></i> 2. Payloads</button>
      <button class="diag-nav-btn" onclick="switchDiagTab('server-patch')"><i class="fa-solid fa-wrench"></i> 3. Parche</button>
      <button class="diag-nav-btn" onclick="switchDiagTab('root-cause')"><i class="fa-solid fa-magnifying-glass"></i> 4. Causa Raíz</button>
    </div>

    <!-- TAB 1: Customer Friendly Response -->
    <div class="diag-tab-pane" id="pane-client-msg">
      <div class="diag-section">
        <div class="diag-sec-title">
          <i class="fa-solid fa-envelope text-mint"></i> Respuesta Cordial y Empática para el Cliente (Zendesk / Ticket):
        </div>
        <div class="customer-message-box">
          <p>${escapeHtml(diag.customerMessage).replace(/\n/g, '<br>')}</p>
        </div>
        <button class="btn-copy-action" onclick="copyTextToClipboard('${escapeJsString(diag.customerMessage)}')">
          <i class="fa-regular fa-copy"></i> Copiar Mensaje
        </button>
      </div>
    </div>

    <!-- TAB 2: Payload Diff (Before vs After & Postman cURL) -->
    <div class="diag-tab-pane hidden" id="pane-payload-diff">
      <div class="diag-section">
        <div class="diag-sec-title"><i class="fa-solid fa-circle-xmark text-coral"></i> ❌ Petición / Payload Enviado (Con Error):</div>
        <pre class="code-block diff-bad"><code>${escapeHtml(diag.badPayload)}</code></pre>
      </div>
      <div class="diag-section">
        <div class="diag-sec-title"><i class="fa-solid fa-circle-check text-mint"></i> ✅ Petición / Payload Corregido (Válido):</div>
        <pre class="code-block diff-good"><code>${escapeHtml(diag.goodPayload)}</code></pre>
      </div>
      <div class="diag-section">
        <div class="diag-sec-title"><i class="fa-solid fa-terminal text-purple"></i> Comando cURL para Postman / Terminal:</div>
        <pre class="code-block"><code>${escapeHtml(diag.curlCommand)}</code></pre>
      </div>
    </div>

    <!-- TAB 3: Server Patch & SQL Script -->
    <div class="diag-tab-pane hidden" id="pane-server-patch">
      <div class="diag-section">
        <div class="diag-sec-title"><i class="fa-solid fa-code text-rose"></i> Corrección en Servidor / Script SQL / Configuración:</div>
        <pre class="code-block"><code>${escapeHtml(diag.serverPatch)}</code></pre>
      </div>
    </div>

    <!-- TAB 4: Root Cause & RAG Pipeline -->
    <div class="diag-tab-pane hidden" id="pane-root-cause">
      <div class="diag-section">
        <div class="diag-sec-title"><i class="fa-solid fa-circle-info text-peach"></i> Análisis de Causa Raíz</div>
        <p class="diag-text">${diag.rootCause}</p>
        <div class="code-block" style="color: #fda4af; margin-top: 6px;">📍 Origen en Código: ${diag.codeOrigin}</div>
      </div>
      <div class="diag-section">
        <div class="diag-sec-title"><i class="fa-solid fa-shield text-mint"></i> Impacto en la Operación</div>
        <p class="diag-text">${diag.operationalImpact}</p>
      </div>
    </div>
  `;
}

window.switchDiagTab = function(tabId) {
  document.querySelectorAll('.diag-nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.diag-tab-pane').forEach(pane => pane.classList.add('hidden'));

  const targetPane = document.getElementById(`pane-${tabId}`);
  if (targetPane) targetPane.classList.remove('hidden');

  event.currentTarget.classList.add('active');
};

window.copyTextToClipboard = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('¡Mensaje copiado al portapapeles!');
  });
};

function escapeJsString(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
}

function openNoteModal(note) {
  document.getElementById('note-modal-title').textContent = note.title;
  document.getElementById('note-modal-content').innerHTML = `
    <div style="margin-bottom: 10px; font-size: 0.75rem; color: #d8b4fe;">
      <i class="fa-solid fa-bookmark"></i> Guía Técnica > <strong>${note.filename}</strong>
    </div>
    <pre style="white-space: pre-wrap; font-family: var(--font-mono);">${escapeHtml(note.content)}</pre>
  `;
  noteModalEl.classList.remove('hidden');
}

function setupEventListeners() {
  document.querySelectorAll('.btn-scenario').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerScenario(btn.dataset.scenario);
    });
  });

  document.getElementById('btn-quick-incident').addEventListener('click', () => {
    const keys = Object.keys(SCENARIOS);
    const nextKey = keys[(keys.indexOf(currentScenario) + 1) % keys.length];
    triggerScenario(nextKey);
  });

  document.getElementById('btn-clear-logs').addEventListener('click', () => {
    terminalLogsEl.innerHTML = '';
    appendRealLog('--- Registro de peticiones limpio ---');
  });

  document.getElementById('btn-inspect-prompt').addEventListener('click', () => {
    updatePromptModalContent('context-diff');
    promptModalEl.classList.remove('hidden');
  });

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    promptModalEl.classList.add('hidden');
  });

  document.getElementById('btn-close-note-modal').addEventListener('click', () => {
    noteModalEl.classList.add('hidden');
  });

  [promptModalEl, noteModalEl].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });

  document.querySelectorAll('.prompt-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.prompt-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      updatePromptModalContent(tab.dataset.tab);
    });
  });

  document.getElementById('btn-copy-prompt').addEventListener('click', () => {
    navigator.clipboard.writeText('Filtro de Contexto: 850 tokens vs 14k tokens. 93.5% ahorro y 0% alucinaciones.');
    alert('¡Métricas copiadas al portapapeles!');
  });
}

function updatePromptModalContent(tabKey) {
  const diffView = document.getElementById('diff-view');
  const promptPre = document.getElementById('prompt-pre');
  const promptCode = document.getElementById('prompt-code-display');

  if (tabKey === 'context-diff') {
    diffView.classList.remove('hidden');
    promptPre.classList.add('hidden');
  } else if (tabKey === 'system-prompt') {
    diffView.classList.add('hidden');
    promptPre.classList.remove('hidden');
    promptCode.textContent = `Eres Sentinel API Support, una analista técnica empática y experta en soporte para integraciones de APIs REST, Webhooks y el protocolo MCP.

DIRECTRICES:
1. Analiza los logs de PM2, códigos de estado HTTP y JSON payloads recibidos.
2. Relaciona el error con la guía técnica o esquema JSON correspondiente.
3. Genera una respuesta humana, cercana, pedagógica y cordial para el desarrollador o cliente.
4. Proporciona el payload JSON corregido, comando cURL para Postman y el script de mitigación.`;
  } else if (tabKey === 'context-payload') {
    diffView.classList.add('hidden');
    promptPre.classList.remove('hidden');
    const currentScen = SCENARIOS[currentScenario];
    promptCode.textContent = `=== FRAGMENTO TÉCNICO INYECTADO (Guía / API Spec) ===
Documento: ${currentScen.sourceFile}
Relevancia Score: ${currentScen.diagnosis.sourceMatch}

${VAULT_NOTES.find(n => n.filename === currentScen.sourceFile)?.content || 'No content'}
=== FIN DEL CONTEXTO (Total Tokens: 380) ===`;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
