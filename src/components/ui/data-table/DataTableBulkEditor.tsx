// import { Button } from "@/components/Button"
import {
  CommandBar,
  CommandBarBar,
  CommandBarCommand,
  CommandBarSeperator,
  CommandBarValue,
} from "@/components/CommandBar"
import api from "@/lib/axios"
import { RowSelectionState, Table } from "@tanstack/react-table"
import { useState } from "react"

type DataTableBulkEditorProps<TData> = {
  table: Table<TData>
  rowSelection: RowSelectionState
}

function DataTableBulkEditor<TData>({
  table,
  rowSelection,
}: DataTableBulkEditorProps<TData>) {
  // const [editDialogOpen, setEditDialogOpen] = useState(false)
  // const [selectedPig, setSelectedPig] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const hasSelectedRows = Object.keys(rowSelection).length > 0
  const selectedCount = Object.keys(rowSelection).length

  const handleDownload = () => {
    const selectedData = table
      .getSelectedRowModel()
      .rows.map((row) => row.original)
    const jsonString = JSON.stringify(selectedData, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "selected_pigs.json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // const handleEdit = () => {
  //   if (selectedCount === 1) {
  //     const selectedRow = table.getSelectedRowModel().rows[0]
  //     setSelectedPig(selectedRow.original)
  //     setEditDialogOpen(true)
  //   }
  // }

  // const handleSave = async (formData: any) => {
  //   setIsLoading(true)
  //   try {
  //     const pigId = selectedPig.owner.replace('PIG-', '')
  //     await axios.put(`http://localhost:5005/api/pigs/${pigId}`, formData)
  //     window.location.reload() // Refresh to show updated data
  //   } catch (error) {
  //     console.error('Error updating pig:', error)
  //     // Here you would show an error notification
  //   } finally {
  //     setIsLoading(false)
  //     setEditDialogOpen(false)
  //   }
  // }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const selectedPigs = table
        .getSelectedRowModel()
        .rows.map((row) => (row.original as any).owner.replace("PIG-", ""))
      await api.delete(`/pigs`, {
        data: { pigIds: selectedPigs },
      })
    } catch (error) {
      console.error("Error deleting pigs:", error)
      // Here you would show an error notification
    } finally {
      setIsLoading(false)
      table.resetRowSelection()
    }
  }

  return (
    <>
      <CommandBar open={hasSelectedRows}>
        <CommandBarBar>
          <CommandBarValue>{selectedCount} selected</CommandBarValue>
          <CommandBarSeperator />
          {/* {selectedCount === 1 && (
            <>
              <CommandBarCommand
                label="Edit"
                action={handleEdit}
                shortcut={{ shortcut: "e" }}
              />
              <CommandBarSeperator />
            </>
          )} */}
          <CommandBarCommand
            label="Download"
            action={handleDownload}
            shortcut={{ shortcut: "d" }}
          />
          <CommandBarSeperator />
          <CommandBarCommand
            label="Delete"
            action={handleDelete}
            shortcut={{ shortcut: "Delete" }}
            disabled={isLoading}
          />
          <CommandBarSeperator />
          <CommandBarCommand
            label="Reset"
            action={() => {
              table.resetRowSelection()
            }}
            shortcut={{ shortcut: "Escape", label: "esc" }}
          />
        </CommandBarBar>
      </CommandBar>
      {/*  
       <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pig Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            handleSave({
              breed: formData.get('breed'),
              age: formData.get('age'),
              group: formData.get('group')
            })
          }}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="breed">Breed</Label>
                  <Input
                    id="breed"
                    name="breed"
                    defaultValue={selectedPig?.breed}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="age">Age (months)</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    defaultValue={selectedPig?.costs}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="group">Group</Label>
                  <Input
                    id="group"
                    name="group"
                    defaultValue={selectedPig?.region.replace('Group ', '')}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setEditDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>  */}
    </>
  )
}

export { DataTableBulkEditor }
