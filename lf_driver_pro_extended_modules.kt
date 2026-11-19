package com.lfdriverpro.app

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.annotation.RequiresApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// ============================================================================
// 1. MEDIA PROJECTION & ML KIT OCR ENGINE (FALLBACK PARSER)
// ============================================================================

class OcrScreenParser(private val context: Context) {
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    fun processImage(bitmap: Bitmap, onResult: (RideOfferData?) -> Unit) {
        val image = InputImage.fromBitmap(bitmap, 0)
        recognizer.process(image)
            .addOnSuccessListener { visionText ->
                val extractedText = visionText.text
                val parsedOffer = parseRawOcrText(extractedText)
                onResult(parsedOffer)
            }
            .addOnFailureListener {
                onResult(null)
            }
    }

    private fun parseRawOcrText(text: String): RideOfferData? {
        val lines = text.split("\n")
        var fare = 0.0
        var pickupDist = 0.0
        var tripDist = 0.0
        var pickupTime = 0.0
        var tripTime = 0.0
        var rating: Double? = null

        val priceRegex = Regex("""(?:R\$\s*)?(\d+[.,]\d{2})""")
        val kmRegex = Regex("""(\d+[.,]?\d*)\s*(?:km|KM)""")
        val minRegex = Regex("""(\d+)\s*(?:min|MIN)""")

        for (line in lines) {
            if (fare == 0.0) {
                priceRegex.find(line)?.groupValues?.get(1)?.let {
                    fare = it.replace(",", ".").toDoubleOrNull() ?: 0.0
                }
            }
        }

        if (fare <= 0.0) return null

        val distanceMatches = kmRegex.findAll(text).mapNotNull { it.groupValues[1].replace(",", ".").toDoubleOrNull() }.toList()
        if (distanceMatches.isNotEmpty()) {
            pickupDist = distanceMatches.getOrElse(0) { 1.0 }
            tripDist = distanceMatches.getOrElse(1) { pickupDist }
        }

        val timeMatches = minRegex.findAll(text).mapNotNull { it.groupValues[1].toDoubleOrNull() }.toList()
        if (timeMatches.isNotEmpty()) {
            pickupTime = timeMatches.getOrElse(0) { 3.0 }
            tripTime = timeMatches.getOrElse(1) { 15.0 }
        }

        return RideOfferData(
            grossFare = fare,
            pickupDistanceKm = pickupDist,
            tripDistanceKm = tripDist,
            pickupTimeMin = pickupTime,
            tripTimeMin = tripTime,
            passengerRating = rating,
            rawText = text,
            confidence = ConfidenceLevel.MEDIUM
        )
    }
}

// ============================================================================
// 2. DIAGNOSTIC & PERMISSION CHECKER
// ============================================================================

data class PermissionStatus(
    val isAccessibilityGranted: Boolean,
    val isOverlayGranted: Boolean,
    val isBatteryOptimizationDisabled: Boolean
)

object DiagnosticManager {
    fun checkPermissions(context: Context): PermissionStatus {
        val overlayGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else true

        val accessibilityEnabled = isAccessibilityServiceEnabled(context, UberOfferAccessibilityService::class.java)

        return PermissionStatus(
            isAccessibilityGranted = accessibilityEnabled,
            isOverlayGranted = overlayGranted,
            isBatteryOptimizationDisabled = true // Simplified check
        )
    }

    private fun isAccessibilityServiceEnabled(context: Context, service: Class<*>): Boolean {
        val expectedComponentName = "${context.packageName}/${service.canonicalName}"
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return enabledServices.contains(expectedComponentName)
    }
}

// ============================================================================
// 3. VEHICLE & CONFIGURATION UI (JETPACK COMPOSE)
// ============================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VehicleConfigScreen(
    currentVehicle: OperationalVehicle,
    onSaveVehicle: (OperationalVehicle) -> Unit
) {
    var fuelPrice by remember { mutableStateOf(currentVehicle.fuelPricePerLiter.toString()) }
    var kmPerLiter by remember { mutableStateOf(currentVehicle.kmPerLiterCombined.toString()) }
    var maintenanceCost by remember { mutableStateOf(currentVehicle.maintenanceCostPerKm.toString()) }
    var depreciation by remember { mutableStateOf(currentVehicle.depreciationPerKm.toString()) }
    var fixedCosts by remember { mutableStateOf(currentVehicle.fixedCostsMonthly.toString()) }
    var monthlyKm by remember { mutableStateOf(currentVehicle.estimatedMonthlyKm.toString()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Configuração do Veículo & Custos", color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF121212))
            )
        },
        containerColor = Color(0xFF121212)
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .padding(16.dp)
                .fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text("CUSTOS VARIÁVEIS", color = Color(0xFFFFB300), fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
            item {
                OutlinedTextField(
                    value = fuelPrice,
                    onValueChange = { fuelPrice = it },
                    label = { Text("Preço do Combustível (R$/L)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFFFFB300))
                )
            }
            item {
                OutlinedTextField(
                    value = kmPerLiter,
                    onValueChange = { kmPerLiter = it },
                    label = { Text("Consumo Médio (Km/L)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            item {
                OutlinedTextField(
                    value = maintenanceCost,
                    onValueChange = { maintenanceCost = it },
                    label = { Text("Manutenção + Pneus por Km (R$)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            item {
                OutlinedTextField(
                    value = depreciation,
                    onValueChange = { depreciation = it },
                    label = { Text("Depreciação por Km (R$)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            item {
                Text("CUSTOS FIXOS MENSAIS", color = Color(0xFFFFB300), fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
            item {
                OutlinedTextField(
                    value = fixedCosts,
                    onValueChange = { fixedCosts = it },
                    label = { Text("Seguro + IPVA + Licenciamento Mensal (R$)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            item {
                OutlinedTextField(
                    value = monthlyKm,
                    onValueChange = { monthlyKm = it },
                    label = { Text("Quilometragem Mensal Estimada (Km)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            item {
                Button(
                    onClick = {
                        val updated = currentVehicle.copy(
                            fuelPricePerLiter = fuelPrice.toDoubleOrNull() ?: 5.79,
                            kmPerLiterCombined = kmPerLiter.toDoubleOrNull() ?: 12.0,
                            maintenanceCostPerKm = maintenanceCost.toDoubleOrNull() ?: 0.15,
                            depreciationPerKm = depreciation.toDoubleOrNull() ?: 0.18,
                            fixedCostsMonthly = fixedCosts.toDoubleOrNull() ?: 800.0,
                            estimatedMonthlyKm = monthlyKm.toIntOrNull() ?: 3000
                        )
                        onSaveVehicle(updated)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFB300))
                ) {
                    Text("SALVAR CUSTOS DO VEÍCULO", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// ============================================================================
// 4. FINANCIAL DASHBOARD & CSV EXPORTER
// ============================================================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    ridesHistory: List<RideHistoryEntity>,
    onExportCsv: () -> Unit
) {
    val totalGrossRevenue = ridesHistory.sumOf { it.grossFare }
    val totalNetProfit = ridesHistory.sumOf { it.netProfit }
    val totalDistance = ridesHistory.sumOf { it.totalDistanceKm }
    val totalRidesCount = ridesHistory.size

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Painel Financeiro LF Driver Pro", color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF121212))
            )
        },
        containerColor = Color(0xFF121212)
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .padding(16.dp)
                .fillMaxSize()
        ) {
            // Stats Header Summary
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                SummaryCard("Faturamento", "R$ ${"%.2f".format(totalGrossRevenue)}", Color(0xFF2E7D32), Modifier.weight(1f))
                Spacer(modifier = Modifier.width(8.dp))
                SummaryCard("Lucro Líquido", "R$ ${"%.2f".format(totalNetProfit)}", Color(0xFF1565C0), Modifier.weight(1f))
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                SummaryCard("Total Corridas", "$totalRidesCount", Color(0xFF424242), Modifier.weight(1f))
                Spacer(modifier = Modifier.width(8.dp))
                SummaryCard("Km Rodados", "${"%.1f".format(totalDistance)} km", Color(0xFF424242), Modifier.weight(1f))
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("HISTÓRICO RECENTE", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Button(
                    onClick = onExportCsv,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF333333))
                ) {
                    Text("Exportar CSV", color = Color.White, fontSize = 12.sp)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(ridesHistory) { ride ->
                    RideHistoryRow(ride = ride)
                }
            }
        }
    }
}

@Composable
fun SummaryCard(title: String, value: String, accentColor: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(title, color = Color.Gray, fontSize = 11.sp, fontWeight = FontWeight.Medium)
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .padding(top = 4.dp)
                    .background(accentColor)
            )
        }
    }
}

@Composable
fun RideHistoryRow(ride: RideHistoryEntity) {
    val formatter = SimpleDateFormat("HH:mm - dd/MM", Locale.getDefault())
    val dateStr = formatter.format(Date(ride.timestamp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E)),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("R$ ${"%.2f".format(ride.grossFare)}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(dateStr, color = Color.Gray, fontSize = 11.sp)
            }

            Column(horizontalAlignment = Alignment.End) {
                Text("Lucro: R$ ${"%.2f".format(ride.netProfit)}", color = Color(0xFF81C784), fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Text("R$/Km: R$ ${"%.2f".format(ride.revenuePerKm)}", color = Color.LightGray, fontSize = 11.sp)
            }
        }
    }
}

object CsvExporter {
    fun exportRidesToCsv(context: Context, rides: List<RideHistoryEntity>): File? {
        val fileName = "LF_Driver_Pro_Export_${System.currentTimeMillis()}.csv"
        val file = File(context.getExternalFilesDir(null), fileName)

        return try {
            val writer = FileWriter(file)
            writer.append("Data,Valor Bruto,Km Total,Tempo Min,Lucro Liquido,R$/Km,R$/Hora,Recomendacao\n")
            val formatter = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())

            for (ride in rides) {
                val dateStr = formatter.format(Date(ride.timestamp))
                writer.append("$dateStr,${ride.grossFare},${ride.totalDistanceKm},${ride.totalTimeMin},${ride.netProfit},${ride.revenuePerKm},${ride.revenuePerHour},${ride.recommendation}\n")
            }
            writer.flush()
            writer.close()
            file
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}