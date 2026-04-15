import AdminLayout from "@/Layouts/AdminLayout";

// ── Componentes de UI internos ────────────────────────────────────────────────

function SectionHeading({ number, title, subtitle }) {
    return (
        <div className="flex items-start gap-4 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-sm font-extrabold text-brand-400">
                {number}
            </div>
            <div>
                <h2 className="text-base font-extrabold text-ink-900">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-ink-400">{subtitle}</p>}
            </div>
        </div>
    );
}

function FieldRow({ label, children }) {
    return (
        <tr className="border-b border-ink-100 last:border-0">
            <td className="py-2.5 pr-4 text-sm font-semibold text-ink-700 whitespace-nowrap align-top w-44">{label}</td>
            <td className="py-2.5 text-sm text-ink-500">{children}</td>
        </tr>
    );
}

function FieldTable({ children }) {
    return (
        <table className="w-full border-collapse mt-3">
            <tbody>{children}</tbody>
        </table>
    );
}

function Callout({ type = "info", children }) {
    const styles = {
        info:    "bg-blue-50  border-blue-200  text-blue-800",
        warning: "bg-amber-50 border-amber-200 text-amber-800",
        tip:     "bg-emerald-50 border-emerald-200 text-emerald-800",
        danger:  "bg-red-50   border-red-200   text-red-800",
    };
    const icons = {
        info:    "ℹ",
        warning: "⚠",
        tip:     "✓",
        danger:  "✕",
    };
    return (
        <div className={`mt-4 flex gap-3 rounded-xl border px-4 py-3 text-sm ${styles[type]}`}>
            <span className="shrink-0 font-extrabold">{icons[type]}</span>
            <div>{children}</div>
        </div>
    );
}

function Card({ children }) {
    return (
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            {children}
        </div>
    );
}

function StepList({ steps }) {
    return (
        <ol className="mt-3 space-y-2">
            {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-ink-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-extrabold text-ink-700">
                        {i + 1}
                    </span>
                    <span>{step}</span>
                </li>
            ))}
        </ol>
    );
}

function Badge({ children, color = "gray" }) {
    const colors = {
        gray:   "bg-ink-100 text-ink-600",
        green:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        yellow: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        red:    "bg-red-50 text-red-600 ring-1 ring-red-200",
    };
    return (
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${colors[color]}`}>
            {children}
        </span>
    );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Info() {
    return (
        <AdminLayout title="Información">
            <div className="max-w-3xl space-y-10">

                {/* Cabecera */}
                <div>
                    <h1 className="text-2xl font-extrabold text-ink-900">Guía de administración</h1>
                    <p className="mt-2 text-sm text-ink-400">
                        Esta guía describe el flujo completo para configurar y mantener los datos del sistema.
                        Sigue el orden indicado, ya que cada sección depende de la anterior.
                    </p>
                </div>

                {/* Mapa de dependencias */}
                <Card>
                    <h2 className="text-sm font-extrabold text-ink-900 mb-4">Orden de alta recomendado</h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-500">
                        {[
                            "Países & Zonas",
                            "Destinos",
                            "Transportistas",
                            "Tipos de pallet",
                            "Tarifas",
                            "Tipos de caja",
                            "Proveedores",
                            "Variantes de caja",
                            "Modelos de dispositivo",
                        ].map((step, i, arr) => (
                            <span key={i} className="flex items-center gap-2">
                                <span className="rounded-lg bg-ink-900 px-3 py-1.5 text-[11px] font-extrabold text-brand-400">
                                    {step}
                                </span>
                                {i < arr.length - 1 && <span className="text-ink-300">→</span>}
                            </span>
                        ))}
                    </div>
                    <Callout type="info">
                        Las <strong>tarifas</strong> solo pueden crearse si existen transportistas, zonas y tipos de pallet.
                        Las <strong>variantes de caja</strong> requieren tipos de caja y proveedores previos.
                        Los <strong>modelos de dispositivo</strong> requieren que el tipo de caja correspondiente exista.
                    </Callout>
                </Card>

                {/* 1. Geografía */}
                <Card>
                    <SectionHeading
                        number="1"
                        title="Geografía — Países, zonas y destinos"
                        subtitle="Define dónde pueden enviarse los pallets y qué zonas tarifarias les aplican."
                    />

                    <p className="text-sm text-ink-500 mb-1">
                        Accede desde <strong>Geografía</strong> en el menú lateral. Este panel integra países, zonas y destinos en una sola vista.
                    </p>

                    <h3 className="mt-5 mb-1 text-xs font-extrabold uppercase tracking-widest text-ink-400">Países</h3>
                    <FieldTable>
                        <FieldRow label="Nombre">Nombre completo del país (ej. España).</FieldRow>
                        <FieldRow label="Código ISO">Código de 2 letras (ej. ES, PT, IT). Usado internamente para identificar si el destino es España o internacional.</FieldRow>
                    </FieldTable>

                    <h3 className="mt-5 mb-1 text-xs font-extrabold uppercase tracking-widest text-ink-400">Zonas</h3>
                    <p className="text-sm text-ink-500">
                        Cada país tiene zonas tarifarias. Una zona agrupa destinos con el mismo precio de transporte para un transportista concreto.
                    </p>
                    <FieldTable>
                        <FieldRow label="Nombre">Identificador de la zona (ej. Zona 1, Zona Baleares). Debe ser único por transportista y país.</FieldRow>
                        <FieldRow label="Transportista">Cada zona pertenece a un único transportista. Si varios transportistas cubren el mismo destino, cada uno tiene su propia zona.</FieldRow>
                    </FieldTable>

                    <h3 className="mt-5 mb-1 text-xs font-extrabold uppercase tracking-widest text-ink-400">Destinos (solo España)</h3>
                    <p className="text-sm text-ink-500">
                        Los destinos españoles se asignan a zonas. Un destino puede pertenecer a zonas de distintos transportistas (una zona por transportista).
                    </p>
                    <Callout type="warning">
                        Si un destino no está asignado a ninguna zona de un transportista, ese transportista <strong>no aparecerá disponible</strong> al seleccionar ese destino en el Palletizer.
                    </Callout>
                </Card>

                {/* 2. Transportistas */}
                <Card>
                    <SectionHeading
                        number="2"
                        title="Transportistas"
                        subtitle="Empresas de transporte que operan en el sistema."
                    />
                    <FieldTable>
                        <FieldRow label="Nombre">Nombre comercial del transportista (ej. Palletways).</FieldRow>
                        <FieldRow label="Código">Identificador corto en mayúsculas (ej. PLW). Usado internamente.</FieldRow>
                        <FieldRow label="Activo">Solo los transportistas activos aparecen en los cálculos del Palletizer. Desactivar un transportista lo oculta sin borrar sus datos.</FieldRow>
                    </FieldTable>
                    <Callout type="tip">
                        Crea primero todos los transportistas antes de pasar a tarifas, ya que las zonas están vinculadas a un transportista específico.
                    </Callout>
                </Card>

                {/* 3. Tipos de pallet */}
                <Card>
                    <SectionHeading
                        number="3"
                        title="Tipos de pallet"
                        subtitle="Define las dimensiones y capacidades de cada formato de pallet disponible."
                    />
                    <FieldTable>
                        <FieldRow label="Nombre">Nombre descriptivo (ej. Pallet Ligero 120×100).</FieldRow>
                        <FieldRow label="Código">Identificador único en mayúsculas (ej. LIGHT). Usado en la selección manual del Palletizer.</FieldRow>
                        <FieldRow label="Base largo / ancho (cm)">Dimensiones de la plataforma del pallet. Determinan cuántas cajas caben por capa.</FieldRow>
                        <FieldRow label="Altura máxima (cm)">Altura total máxima permitida incluyendo el pallet. Limita el número de capas.</FieldRow>
                        <FieldRow label="Peso máximo (kg)">Capacidad de carga máxima. El algoritmo no superará este límite al apilar.</FieldRow>
                    </FieldTable>
                    <Callout type="warning">
                        Cambiar las dimensiones de un tipo de pallet afecta a todos los cálculos futuros. Los cálculos ya realizados no se recalculan automáticamente.
                    </Callout>
                </Card>

                {/* 4. Tarifas */}
                <Card>
                    <SectionHeading
                        number="4"
                        title="Tarifas"
                        subtitle="Precio que cobra cada transportista por zona y tipo de pallet."
                    />
                    <p className="text-sm text-ink-500">
                        Una tarifa vincula un <strong>transportista</strong>, una <strong>zona</strong> y un <strong>tipo de pallet</strong> con un precio. El Palletizer evalúa todas las tarifas disponibles para el destino seleccionado y elige la más económica.
                    </p>
                    <FieldTable>
                        <FieldRow label="Transportista">Debe existir previamente y estar activo.</FieldRow>
                        <FieldRow label="Zona">Zona del transportista que cubre el destino del envío.</FieldRow>
                        <FieldRow label="Tipo de pallet">Formato de pallet al que aplica el precio.</FieldRow>
                        <FieldRow label="Precio por pallet (€)">Coste unitario por pallet en esa zona con ese tipo.</FieldRow>
                        <FieldRow label="Mínimo (€)">Coste mínimo del envío, independientemente del número de pallets. Si el total calculado es inferior al mínimo, se aplica el mínimo.</FieldRow>
                    </FieldTable>
                    <Callout type="info">
                        Si un transportista tiene varias zonas que cubren el mismo destino (ej. zonas insulares), todas las tarifas aplicables se evalúan y gana la más barata.
                    </Callout>
                    <Callout type="warning">
                        Si no existe ninguna tarifa para la combinación transportista + zona + tipo de pallet, ese plan no se generará. Asegúrate de crear tarifas para todos los tipos de pallet que quieras que el Palletizer considere.
                    </Callout>
                </Card>

                {/* 5. Cajas */}
                <Card>
                    <SectionHeading
                        number="5"
                        title="Cajas de embalaje"
                        subtitle="Material con el que se empaquetan los equipos antes de paletizar."
                    />

                    <h3 className="mt-2 mb-1 text-xs font-extrabold uppercase tracking-widest text-ink-400">5a · Tipos de caja</h3>
                    <p className="text-sm text-ink-500">
                        Categorías genéricas que clasifican las cajas por tipo de equipo. Cada tipo de caja tiene unas dimensiones base y un peso de referencia.
                    </p>
                    <FieldTable>
                        <FieldRow label="Nombre">Nombre descriptivo (ej. Caja Torre MT, Caja Portátil).</FieldRow>
                        <FieldRow label="Código">Código interno que el sistema usa para vincular con los modelos de dispositivo (<Badge>tower</Badge>, <Badge>laptop</Badge>, <Badge>mini_pc</Badge>, <Badge>tower_sff</Badge>).</FieldRow>
                        <FieldRow label="Dimensiones (cm)">Largo × ancho × alto de la caja. El algoritmo las usa para calcular cuántas caben por capa y si pueden apilarse.</FieldRow>
                        <FieldRow label="Peso base (kg)">Peso de referencia. Se usa si el modelo de dispositivo no tiene peso propio definido.</FieldRow>
                    </FieldTable>

                    <h3 className="mt-6 mb-1 text-xs font-extrabold uppercase tracking-widest text-ink-400">5b · Proveedores</h3>
                    <p className="text-sm text-ink-500">
                        Empresas que suministran el material de embalaje. Son necesarios antes de crear variantes.
                    </p>
                    <FieldTable>
                        <FieldRow label="Nombre">Nombre del proveedor (ej. ByteBox).</FieldRow>
                        <FieldRow label="Contacto">Información de contacto opcional para referencia interna.</FieldRow>
                    </FieldTable>

                    <h3 className="mt-6 mb-1 text-xs font-extrabold uppercase tracking-widest text-ink-400">5c · Variantes de caja</h3>
                    <p className="text-sm text-ink-500">
                        Una variante es una caja concreta de un proveedor concreto, con sus dimensiones reales, condición, stock actual y coste.
                    </p>
                    <FieldTable>
                        <FieldRow label="Tipo de caja">A qué categoría pertenece (ej. Caja Torre MT).</FieldRow>
                        <FieldRow label="Proveedor">Quién la suministra.</FieldRow>
                        <FieldRow label="Condición"><Badge color="green">Nueva</Badge> o <Badge color="yellow">Reutilizada</Badge>. Solo las cajas nuevas tienen coste asignado al cálculo.</FieldRow>
                        <FieldRow label="Dimensiones reales (cm)">Pueden diferir ligeramente del tipo base. El algoritmo usa estas dimensiones exactas para el plan.</FieldRow>
                        <FieldRow label="Stock (uds.)">Unidades disponibles actualmente. <Badge color="green">En stock</Badge> si &gt; 0, <Badge color="red">Sin stock</Badge> si = 0.</FieldRow>
                        <FieldRow label="Coste unitario (€)">Precio por caja. Aparece en el desglose de coste total del plan.</FieldRow>
                    </FieldTable>
                    <Callout type="tip">
                        El campo <strong>En stock / Sin stock</strong> en el Palletizer refleja el valor de la columna <em>stock</em> de la variante. Actualiza este valor cuando recibas o consumas material.
                    </Callout>
                    <Callout type="warning">
                        Si ninguna variante de un tipo de caja tiene stock, el Palletizer calculará el plan sin coste de embalaje para ese tipo de equipo y mostrará un aviso.
                    </Callout>
                </Card>

                {/* 6. Modelos de dispositivo */}
                <Card>
                    <SectionHeading
                        number="6"
                        title="Modelos de dispositivo"
                        subtitle="Catálogo de equipos informáticos que pueden incluirse en un envío."
                    />
                    <p className="text-sm text-ink-500">
                        Los modelos permiten al operador del Palletizer seleccionar equipos por nombre en lugar de introducir cantidades por tipo. El sistema agrupa los modelos por tipo de caja y calcula los pallets en consecuencia.
                    </p>
                    <FieldTable>
                        <FieldRow label="Marca">Fabricante del equipo (ej. Dell, HP, Lenovo).</FieldRow>
                        <FieldRow label="Nombre / Referencia">Modelo exacto (ej. Latitude 5400, EliteBook 840).</FieldRow>
                        <FieldRow label="Tipo de caja">A qué categoría pertenece este equipo (<Badge>tower</Badge>, <Badge>laptop</Badge>…). Determina cómo se paletiza.</FieldRow>
                        <FieldRow label="Peso (kg)">Peso real del equipo. Si se define, el algoritmo lo usa para el cálculo de peso por pallet en lugar del peso base del tipo de caja.</FieldRow>
                        <FieldRow label="Activo">Solo los modelos activos aparecen en el selector del Palletizer. Desactiva modelos descatalogados sin borrarlos.</FieldRow>
                    </FieldTable>
                    <Callout type="info">
                        El peso del modelo tiene <strong>prioridad</strong> sobre el peso del tipo de caja. Si un equipo tiene un peso inusual (muy ligero o muy pesado), defínelo aquí para obtener cálculos precisos.
                    </Callout>
                </Card>

                {/* Operaciones habituales */}
                <Card>
                    <SectionHeading
                        number="★"
                        title="Operaciones habituales"
                        subtitle="Acciones recurrentes una vez el sistema está configurado."
                    />

                    <div className="space-y-5">
                        <div>
                            <h3 className="text-sm font-extrabold text-ink-800">Actualizar stock de cajas</h3>
                            <StepList steps={[
                                "Ve a Cajas → Variantes.",
                                "Filtra por tipo o proveedor para localizar la variante.",
                                "Edita el campo Stock con las unidades disponibles tras el último inventario.",
                                "Guarda. El cambio se refleja inmediatamente en el Palletizer.",
                            ]} />
                        </div>

                        <div>
                            <h3 className="text-sm font-extrabold text-ink-800">Añadir una nueva tarifa</h3>
                            <StepList steps={[
                                "Verifica que el transportista, la zona y el tipo de pallet ya existen.",
                                "Ve a Transporte → Tarifas.",
                                "Pulsa «Nueva tarifa» y completa todos los campos.",
                                "El Palletizer considerará la nueva tarifa en el próximo cálculo.",
                            ]} />
                        </div>

                        <div>
                            <h3 className="text-sm font-extrabold text-ink-800">Añadir un nuevo modelo de dispositivo</h3>
                            <StepList steps={[
                                "Asegúrate de que el tipo de caja correspondiente existe (Cajas → Tipos de caja).",
                                "Ve a Equipos → Modelos de dispositivo.",
                                "Pulsa «Nuevo modelo», completa marca, nombre, tipo de caja y peso.",
                                "Actívalo. Ya aparecerá en el selector del Palletizer.",
                            ]} />
                        </div>

                        <div>
                            <h3 className="text-sm font-extrabold text-ink-800">Desactivar un transportista temporalmente</h3>
                            <StepList steps={[
                                "Ve a Transporte → Transportistas.",
                                "Edita el transportista y desactiva el toggle «Activo».",
                                "El transportista desaparece de los cálculos sin perder sus tarifas ni zonas.",
                                "Reactívalo cuando vuelva a estar operativo.",
                            ]} />
                        </div>
                    </div>
                </Card>

                {/* Relación con el Palletizer */}
                <Card>
                    <SectionHeading
                        number="→"
                        title="Cómo usan estos datos el Palletizer"
                        subtitle="Qué busca el algoritmo en cada cálculo."
                    />
                    <div className="space-y-3 text-sm text-ink-500">
                        <p>Cuando el operador lanza un cálculo, el sistema:</p>
                        <ol className="space-y-2 pl-1">
                            {[
                                "Identifica el destino (destino español → zona, o zona directa para otros países).",
                                "Busca todos los transportistas activos que tienen una tarifa para esa zona.",
                                "Para cada transportista y cada tipo de pallet con tarifa, simula el paletizado completo con las dimensiones y pesos reales de las cajas.",
                                "Calcula el coste total de transporte (pallets × precio) más el coste de embalaje (variantes en stock seleccionadas).",
                                "Ordena todos los planes por coste total y presenta el más económico como «Plan óptimo», y los siguientes como alternativas.",
                            ].map((step, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-extrabold text-ink-700">{i + 1}</span>
                                    <span>{step}</span>
                                </li>
                            ))}
                        </ol>
                        <Callout type="danger">
                            Si faltan datos clave — zonas sin destinos asignados, tipos de pallet sin tarifa, o variantes de caja sin stock — el resultado puede ser incorrecto o incompleto. Mantén los datos actualizados para obtener planes fiables.
                        </Callout>
                    </div>
                </Card>

            </div>
        </AdminLayout>
    );
}
