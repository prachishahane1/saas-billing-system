package com.triplixtech.saas.controller;

import com.triplixtech.saas.entity.Invoice;
import com.triplixtech.saas.service.InvoiceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/invoices")
public class InvoiceController {

    @Autowired
    private InvoiceService invoiceService;

    @PostMapping
    public ResponseEntity<Invoice> create(@RequestBody Invoice invoice) {
        return ResponseEntity.ok(invoiceService.saveInvoice(invoice));
    }

    @GetMapping
    public ResponseEntity<List<Invoice>> getAll() {
        return ResponseEntity.ok(invoiceService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Invoice> getById(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getById(id));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Invoice>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(invoiceService.getByUser(userId));
    }

    @GetMapping("/subscription/{subId}")
    public ResponseEntity<List<Invoice>> getBySubscription(@PathVariable Long subId) {
        return ResponseEntity.ok(invoiceService.getBySubscription(subId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        invoiceService.deleteInvoice(id);
        return ResponseEntity.noContent().build();
    }
}