package com.triplixtech.saas.controller;

import com.triplixtech.saas.entity.PaymentLog;
import com.triplixtech.saas.service.PaymentLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/payment-logs")
public class PaymentLogController {

    @Autowired
    private PaymentLogService paymentLogService;

    @PostMapping
    public ResponseEntity<PaymentLog> create(@RequestBody PaymentLog log) {
        return ResponseEntity.ok(paymentLogService.saveLog(log));
    }

    @GetMapping
    public ResponseEntity<List<PaymentLog>> getAll() {
        return ResponseEntity.ok(paymentLogService.getAll());
    }

    @GetMapping("/payment/{paymentId}")
    public ResponseEntity<List<PaymentLog>> getByPayment(@PathVariable Long paymentId) {
        return ResponseEntity.ok(paymentLogService.getByPayment(paymentId));
    }
}