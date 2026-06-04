package com.triplixtech.saas.service;

import com.triplixtech.saas.entity.Invoice;
import com.triplixtech.saas.repository.InvoiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class InvoiceService {

    @Autowired
    private InvoiceRepository invoiceRepository;

    public Invoice saveInvoice(Invoice invoice) {
        return invoiceRepository.save(invoice);
    }

    public List<Invoice> getAll() {
        return invoiceRepository.findAll();
    }

    public List<Invoice> getByUser(Long userId) {
        return invoiceRepository.findByUser_UserId(userId);
    }

    public List<Invoice> getBySubscription(Long subId) {
        return invoiceRepository.findBySubscription_SubscriptionId(subId);
    }

    public Invoice getById(Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
    }

    public void deleteInvoice(Long id) {
        invoiceRepository.deleteById(id);
    }
}