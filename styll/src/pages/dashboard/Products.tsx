import React, { useState } from 'react'
import { Plus, Package, AlertTriangle } from 'lucide-react'
import { useProducts } from '../../hooks/useProducts'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatCurrency } from '../../lib/utils/currency'

const Products: React.FC = () => {
  const { products, isLoading } = useProducts()

  const isLowStock = (product: typeof products[0]) => {
    const inv = (product as unknown as { product_inventory?: { quantity: number; low_stock_threshold: number } }).product_inventory
    return inv && inv.quantity <= inv.low_stock_threshold
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Prodotti</h1>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          Nuovo prodotto
        </Button>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : products.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Nessun prodotto ancora"
          message="Aggiungi i prodotti che vendi per tenerli sotto controllo"
        />
      ) : (
        <div className="space-y-2">
          {products.map(product => {
            const inv = (product as unknown as { product_inventory?: { quantity: number; low_stock_threshold: number } }).product_inventory
            const low = isLowStock(product)

            return (
              <Card key={product.id}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      {product.brand && (
                        <span className="text-xs text-gray-400">{product.brand}</span>
                      )}
                      {low && (
                        <Badge variant="warning">
                          <AlertTriangle className="w-3 h-3" />
                          Scorta bassa
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-sm font-medium text-gray-700">
                        {formatCurrency(product.price_sell)}
                      </span>
                      {inv && (
                        <span className={`text-xs ${low ? 'text-yellow-600 font-medium' : 'text-gray-400'}`}>
                          {inv.quantity} pz in magazzino
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Products
