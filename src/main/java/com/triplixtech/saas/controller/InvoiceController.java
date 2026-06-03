package com.triplixtech.saas.controller;

import com.triplixtech.saas.entity.Invoice;
import com.triplixtech.saas.service.InvoiceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/invoices")
public class InvoiceController {

    @Autowired
    private InvoiceService invoiceService;

    @PostMapping
    public Invoice create(@RequestBody Invoice invoice){
        return invoiceService.saveInvoice(invoice);
    }

    @GetMapping
    public List<Invoice> getAll(){
        return invoiceService.getAll();
    }

    @GetMapping("/{id}")
    public Invoice getById(@PathVariable Long id){
        return invoiceService.getById(id);
    }
}